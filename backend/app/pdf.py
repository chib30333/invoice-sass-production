"""Render an invoice to PDF.

The layout is the original INV-00017 invoice: every measurement is in PDF points on A4 and was
taken from that document (it was first built with @react-pdf/renderer; this is a port of it).
Positions are written top-down like the measurements and flipped for ReportLab when drawn.
frontend/src/components/PdfSheet.tsx draws the same layout in CSS for the editor's live preview.
"""
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from io import BytesIO
from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen.canvas import Canvas

from . import money
from .config import settings as app_settings
from .models import BusinessSettings, Invoice

PAGE_W, PAGE_H = A4
TOP, BOTTOM = 27.8, PAGE_H - 54.2  # page padding

INK = HexColor("#252526")
HEADER_FILL = HexColor("#F5F5F5")
HEADER_RULE = HexColor("#DCDCDC")
RULE = HexColor("#E6E6E6")
LINK = HexColor("#287CCF")
FOOTER_INK = HexColor("#666666")
BLACK = HexColor("#000000")

REGULAR, BOLD = "InvoiceSans", "InvoiceSans-Bold"
ASCENT = 2026 / 2048  # Selawik's ascender: the first baseline sits this far below the top of a text box

# Items table: x=17..580, column widths sum to 563.
TABLE_X, TABLE_W = 17, 563
COLS = {"num": 19, "desc": 179, "period": 84, "qty": 42, "price": 66, "amount": 74, "tax_pct": 34, "tax_amt": 65}
# The description may run 8pt into the (empty) left side of the Work period column, exactly like the
# original invoice, so typical two-line descriptions don't wrap to three.
DESC_TEXT_W = COLS["desc"] - 4 + 8
HEAD_H = 21.2
CELL_SIZE, CELL_LH = 9.75, 1.2308
ROW_PAD_TOP, ROW_PAD_BOTTOM = 4.3, 5.6

TOTALS_X, TOTAL_LABEL_W, TOTAL_VALUE_W = 397, 92, 90.7
BOTTOM_X, BOTTOM_W = 18, 558
LINE_SIZE, LINE_LH = 11.62, 1.394
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


# ---- data -------------------------------------------------------------------
@dataclass
class DocItem:
    description: str
    work_from: date | None
    work_to: date | None
    quantity: float
    unit_price: float


@dataclass
class InvoiceDoc:
    """Everything printed on the invoice, already resolved to lines of text."""

    number: str
    issued_on: date
    due_on: date
    currency: str
    tax_rate: float
    payment_terms: str
    client_name: str
    client_lines: list[str]
    seller_lines: list[str]
    bank_lines: list[str]
    items: list[DocItem]
    payment_link: str = ""
    bank_title: str = "Account details"
    totals: dict = field(init=False)

    def __post_init__(self):
        self.totals = money.totals(((i.quantity, i.unit_price) for i in self.items), self.tax_rate)


def _lines(text: str) -> list[str]:
    return [ln.rstrip() for ln in (text or "").splitlines() if ln.strip()]


def bank_lines(s: BusinessSettings) -> list[str]:
    pairs = [("Account holder", s.account_holder), ("Account number", s.account_number),
             ("Routing number", s.routing_number), ("IBAN", s.iban), ("SWIFT/BIC", s.bic), ("Bank", s.bank_name)]
    return [f"{label}: {value.strip()}" for label, value in pairs if value and value.strip()]


def doc_from_models(inv: Invoice, s: BusinessSettings) -> InvoiceDoc:
    client = inv.client
    return InvoiceDoc(
        number=inv.number, issued_on=inv.issued_on, due_on=inv.due_on, currency=inv.currency, tax_rate=inv.tax_rate,
        payment_terms=f"Net {s.payment_terms_days} days",
        client_name=client.name if client else "",
        client_lines=([client.attention.strip()] if client and client.attention.strip() else []) + _lines(client.address if client else ""),
        seller_lines=[ln for ln in [s.business_name.strip(), *_lines(s.business_address), s.business_email.strip(), s.tax_id.strip()] if ln],
        bank_lines=bank_lines(s),
        items=[DocItem(i.description, i.work_from, i.work_to, i.quantity, i.unit_price) for i in inv.items],
        payment_link=inv.payment_link if s.show_payment_link else "",
    )


# ---- formatting (same output as frontend/src/lib/invoice.ts) ----------------
def fmt_date(d: date | None) -> str:
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}" if d else ""


def fmt_period(start: date | None, end: date | None) -> str:
    if start and end:
        return f"{start:%m/%d} – {end:%m/%d}"
    d = start or end
    return f"{d:%m/%d}" if d else ""


def fmt_plain(v: float) -> str:
    """60.0 -> '60', 7.5 -> '7.5' (like JavaScript's String(n))."""
    return format(Decimal(str(v)).normalize(), "f")


def fmt_money(v: float, currency: str) -> str:
    return f"{v:,.2f} {currency}"


# ---- drawing helpers --------------------------------------------------------
def _register_fonts() -> None:
    if REGULAR in pdfmetrics.getRegisteredFontNames():
        return
    fonts = Path(__file__).parent / "fonts"
    pdfmetrics.registerFont(TTFont(REGULAR, app_settings.pdf_font_regular or str(fonts / "Selawik-Regular.ttf")))
    pdfmetrics.registerFont(TTFont(BOLD, app_settings.pdf_font_bold or str(fonts / "Selawik-Bold.ttf")))


def _width(text: str, size: float, bold: bool = False) -> float:
    return pdfmetrics.stringWidth(text, BOLD if bold else REGULAR, size)


def wrap(text: str, size: float, width: float, bold: bool = False) -> list[str]:
    """Greedy word wrap; Enter starts a new line; words are never hyphenated, only split when wider than the box."""
    out: list[str] = []
    for para in (text or "").split("\n"):
        line = ""
        for word in para.split(" "):
            candidate = f"{line} {word}" if line else word
            if _width(candidate, size, bold) <= width:
                line = candidate
                continue
            if line:
                out.append(line)
            line = word
            while _width(line, size, bold) > width and len(line) > 1:  # a single word wider than the box
                cut = len(line) - 1
                while cut > 1 and _width(line[:cut], size, bold) > width:
                    cut -= 1
                out.append(line[:cut])
                line = line[cut:]
        out.append(line)
    return out


class _Page:
    """Draw calls for one page, replayed once the total page count is known (for the footer)."""

    def __init__(self):
        self.ops: list[Callable[[Canvas], None]] = []

    def text(self, x: float, top: float, text: str, size: float, bold=False, color=INK, align="left", width=0.0):
        if align == "center":
            x += (width - _width(text, size, bold)) / 2
        elif align == "right":
            x += width - _width(text, size, bold)

        def op(c: Canvas):
            c.setFont(BOLD if bold else REGULAR, size)
            c.setFillColor(color)
            c.drawString(x, PAGE_H - top - ASCENT * size, text)
        self.ops.append(op)
        return x

    def box(self, x: float, top: float, w: float, h: float, color):
        def op(c: Canvas):
            c.setFillColor(color)
            c.rect(x, PAGE_H - top - h, w, h, stroke=0, fill=1)
        self.ops.append(op)

    def link(self, x: float, top: float, text: str, size: float, url: str):
        self.text(x, top, text, size, color=LINK)
        w = _width(text, size)
        baseline = PAGE_H - top - ASCENT * size

        def op(c: Canvas):
            c.setStrokeColor(LINK)
            c.setLineWidth(size / 18)
            c.line(x, baseline - size * 0.1, x + w, baseline - size * 0.1)
            c.linkURL(url, (x, baseline - size * 0.25, x + w, baseline + size * 0.8), relative=0)
        self.ops.append(op)


# ---- layout -----------------------------------------------------------------
def _cell(page: _Page, x: float, top: float, width: float, text: str, align: str, size=CELL_SIZE, bold=False, lh=CELL_LH):
    """A table cell: left-aligned cells have 4pt of padding, centred ones none."""
    inner_x, inner_w = (x + 4, width - 4) if align == "left" else (x, width)
    lines = wrap(text, size, inner_w, bold)
    for n, ln in enumerate(lines):
        page.text(inner_x, top + n * size * lh, ln, size, bold, align=align, width=inner_w)
    return len(lines) * size * lh


def _table_head(page: _Page, top: float) -> float:
    page.box(TABLE_X, top, TABLE_W, HEAD_H, HEADER_FILL)
    page.box(TABLE_X, top + HEAD_H - 1, TABLE_W, 1, HEADER_RULE)
    x = TABLE_X
    heads = [("num", "#", "left"), ("desc", "Item description", "left"), ("period", "Work period", "center"),
             ("qty", "Quantity", "center"), ("price", "Price", "center"), ("amount", "Amount", "center"),
             ("tax_pct", "Tax %", "center"), ("tax_amt", "Tax amount", "left")]
    for key, label, align in heads:
        _cell(page, x, top + 4.1, COLS[key], label, align, size=9, bold=True, lh=1.333)
        x += COLS[key]
    return top + HEAD_H


def _row_cells(doc: InvoiceDoc, i: int) -> list[tuple[str, str, str]]:
    it, t, cur = doc.items[i], doc.totals, doc.currency
    return [
        ("num", str(i + 1), "left"),
        ("desc", it.description, "desc"),
        ("period", fmt_period(it.work_from, it.work_to), "center"),
        ("qty", fmt_plain(it.quantity), "center"),
        ("price", fmt_money(it.unit_price, cur), "center"),
        ("amount", fmt_money(t["amounts"][i], cur), "center"),
        ("tax_pct", f"{fmt_plain(doc.tax_rate)}%", "center"),
        ("tax_amt", fmt_money(t["taxes"][i], cur), "left"),
    ]


def _row_height(doc: InvoiceDoc, i: int) -> float:
    lines = 1
    for key, text, align in _row_cells(doc, i):
        width = DESC_TEXT_W if align == "desc" else COLS[key] - (4 if align == "left" else 0)
        lines = max(lines, len(wrap(text, CELL_SIZE, width)))
    return ROW_PAD_TOP + lines * CELL_SIZE * CELL_LH + ROW_PAD_BOTTOM + 1


def _draw_row(page: _Page, doc: InvoiceDoc, i: int, top: float, height: float) -> None:
    page.box(TABLE_X, top + height - 1, TABLE_W, 1, RULE)
    x = TABLE_X
    for key, text, align in _row_cells(doc, i):
        if align == "desc":
            for n, ln in enumerate(wrap(text, CELL_SIZE, DESC_TEXT_W)):
                page.text(x + 4, top + ROW_PAD_TOP + n * CELL_SIZE * CELL_LH, ln, CELL_SIZE)
        else:
            _cell(page, x, top + ROW_PAD_TOP, COLS[key], text, align)
        x += COLS[key]


TOTALS_H = 26 + 25 + 1 + 31  # Subtotal row (with rule), tax row, rule, grand-total bar


def _draw_totals(page: _Page, doc: InvoiceDoc, top: float) -> None:
    t, cur = doc.totals, doc.currency
    w = TOTAL_LABEL_W + TOTAL_VALUE_W

    def pair(row_top: float, label: str, value: str, size: float, bold: bool):
        page.text(TOTALS_X + 4, row_top, label, size, bold)
        page.text(TOTALS_X + TOTAL_LABEL_W, row_top, value, size, bold, align="right", width=TOTAL_VALUE_W - 4.7)

    pair(top + 6, "Subtotal", fmt_money(t["subtotal"], cur), 10.5, False)
    page.box(TOTALS_X, top + 25, w, 1, RULE)
    pair(top + 26 + 6, f"Total tax ({fmt_plain(doc.tax_rate)}%)", fmt_money(t["tax"], cur), 10.5, False)
    page.box(TOTALS_X, top + 51, w, 1, RULE)
    page.box(TOTALS_X, top + 52, w, 31, HEADER_FILL)
    pair(top + 52 + 3.4, "Total payment", fmt_money(t["total"], cur), 9, True)


def _pay_lines(doc: InvoiceDoc) -> list[list[tuple[str, bool]]]:
    """'Pay {total} via link: {url}' split into lines of (text, is_link) runs; long links break anywhere."""
    if not doc.payment_link:
        return []
    size, width = 10.5, BOTTOM_W - 4
    prefix = f"Pay {fmt_money(doc.totals['total'], doc.currency)} via link: "
    lines: list[list[tuple[str, bool]]] = [[(prefix, False)]]
    used, rest = _width(prefix, size), doc.payment_link
    while rest:
        cut = len(rest)
        while cut > 1 and used + _width(rest[:cut], size) > width:
            cut -= 1
        lines[-1].append((rest[:cut], True))
        rest = rest[cut:]
        if rest:
            lines.append([])
            used = 0
    return lines


def _bottom_height(doc: InvoiceDoc) -> float:
    seller = 13.15 + len(doc.seller_lines) * LINE_SIZE * LINE_LH
    bank = 17 + 13.5 * 1.333 + 1.65 + len(doc.bank_lines) * LINE_SIZE * LINE_LH
    pay = len(_pay_lines(doc))
    return 1 + max(seller, bank) + (3.35 + pay * 10.5 * 1.333 if pay else 0)


def _draw_bottom(page: _Page, doc: InvoiceDoc, top: float) -> None:
    page.box(BOTTOM_X, top, BOTTOM_W, 1, RULE)
    step = LINE_SIZE * LINE_LH
    for n, ln in enumerate(doc.seller_lines):
        page.text(BOTTOM_X + 3, top + 1 + 13.15 + n * step, ln, LINE_SIZE, color=BLACK)
    bank_x, y = BOTTOM_X + 3 + 269, top + 1 + 17
    page.text(bank_x, y, doc.bank_title, 13.5, bold=True, color=BLACK)
    y += 13.5 * 1.333 + 1.65
    for n, ln in enumerate(doc.bank_lines):
        page.text(bank_x, y + n * step, ln, LINE_SIZE, color=BLACK)
    seller_h = 13.15 + len(doc.seller_lines) * step
    bank_h = 17 + 13.5 * 1.333 + 1.65 + len(doc.bank_lines) * step
    y = top + 1 + max(seller_h, bank_h) + 3.35
    for line in _pay_lines(doc):
        x = BOTTOM_X + 4
        for text, is_link in line:
            if is_link:
                page.link(x, y, text, 10.5, doc.payment_link)
            else:
                page.text(x, y, text, 10.5)
            x += _width(text, 10.5)
        y += 10.5 * 1.333


def _draw_footer(c: Canvas, number: str, page_no: int, pages: int) -> None:
    size, top = 11.25, 796.3
    text = f"{page_no}/{pages} for invoice #{number}"
    c.setFont(REGULAR, size)
    c.setFillColor(FOOTER_INK)
    c.drawString(17, PAGE_H - top - ASCENT * size, text)
    x = 17 + _width(text, size) + 11.5
    c.setFillColor(RULE)
    c.rect(x, PAGE_H - top - 9 - 1, PAGE_W - 18 - x, 1, stroke=0, fill=1)


def layout(doc: InvoiceDoc) -> list[_Page]:
    pages = [_Page()]
    p = pages[0]

    # Title, "To" / "Payment terms" bars and the two party blocks
    p.text(20, TOP, f"Invoice #{doc.number}", 18.75, bold=True)
    y = TOP + 18.75 * 1.333 + 36.2
    p.box(16, y, 308.4, 24.2, HEADER_FILL)
    p.box(354, y, 225.6, 24.2, HEADER_FILL)
    p.text(20, y + 5.2, "To", 9.75, bold=True)
    p.text(357.4, y + 5.2, "Payment terms", 9.75, bold=True)
    y += 24.2 + 1.6
    step = 12 * 1.333
    left = ([(doc.client_name, True)] if doc.client_name else []) + [(ln, False) for ln in doc.client_lines]
    for n, (ln, bold) in enumerate(left):
        p.text(20, y + n * step, ln, 12, bold=bold)
    right = [doc.payment_terms, f"Date issued: {fmt_date(doc.issued_on)}", f"Due date: {fmt_date(doc.due_on)}"]
    for n, ln in enumerate(right):
        p.text(357.4, y + n * step, ln, 12)
    y += max(len(left), len(right)) * step

    # Items: the header row repeats on every page; a row never splits across pages
    y = _table_head(p, y + 36)
    on_page = 0
    for i in range(len(doc.items)):
        h = _row_height(doc, i)
        if y + h > BOTTOM and on_page:
            p = _Page()
            pages.append(p)
            y, on_page = _table_head(p, TOP), 0
        _draw_row(p, doc, i, y, h)
        y += h
        on_page += 1

    # Totals, then the seller / bank block pinned to the bottom of the last page
    if y + 24.1 + TOTALS_H > BOTTOM:
        p = _Page()
        pages.append(p)
        y = TOP
    else:
        y += 24.1
    _draw_totals(p, doc, y)
    y += TOTALS_H
    bottom_h = _bottom_height(doc)
    if y + bottom_h > BOTTOM:
        p = _Page()
        pages.append(p)
    _draw_bottom(p, doc, BOTTOM - bottom_h)
    return pages


def render_pdf(doc: InvoiceDoc) -> bytes:
    _register_fonts()
    buf = BytesIO()
    c = Canvas(buf, pagesize=A4)
    c.setTitle(f"Invoice #{doc.number}")
    if doc.seller_lines:
        c.setAuthor(doc.seller_lines[0])
    pages = layout(doc)
    for n, page in enumerate(pages, start=1):
        for op in page.ops:
            op(c)
        _draw_footer(c, doc.number, n, len(pages))
        c.showPage()
    c.save()
    return buf.getvalue()


def render_invoice_pdf(inv: Invoice, s: BusinessSettings) -> bytes:
    return render_pdf(doc_from_models(inv, s))
