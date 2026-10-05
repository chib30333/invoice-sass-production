"""The PDF must keep the original INV-00017 layout.

The expected positions were read from the PDF the original @react-pdf/renderer app produced
for the same data (top-down y of each text baseline, x of its left edge, in points).
"""
from datetime import date
from io import BytesIO

import pytest
from pypdf import PdfReader

from app import money
from app.models import LineItem
from app.pdf import fmt_date, fmt_period, fmt_plain, render_invoice_pdf, wrap, _register_fonts
from app.sample import sample_models

REFERENCE = [  # (text, x, baseline)
    ("Invoice #INV-00017", 20.0, 46.35),
    ("To", 20.0, 103.84),
    ("Payment terms", 357.4, 103.84),
    ("RADIIA", 20.0, 126.66),
    ("New York, 10036", 20.0, 190.65),
    ("Date issued: 23 Sep 2026", 357.4, 142.66),
    ("Due date: 26 Sep 2026", 357.4, 158.66),
    ("Item description", 40.0, 243.78),
    ("Work period", 230.35, 243.78),
    ("Implement reports, dashboard panels", 40.0, 265.92),
    ("09/01 – 09/07", 227.07, 265.92),
    ("line marks + diamond list column features", 40.0, 347.72),
    ("Subtotal", 401.0, 397.16),
    ("Total payment", 401.0, 445.07),
    ("Serhii Chornyi", 21.0, 693.55),
    ("Account details", 290.0, 699.26),
    ("Bank: Citibank", 290.0, 765.64),
    ("Pay 3,600.00 USD via link: ", 22.0, 784.08),
    ("1/1 for invoice #INV-00017", 17.0, 807.43),
]


def positions(pdf: bytes) -> list[dict]:
    out = []
    for page in PdfReader(BytesIO(pdf)).pages:
        height = float(page.mediabox.height)
        runs: list[tuple[str, float, float]] = []

        def visit(t, cm, tm, *_):
            if t.strip():
                x, y = tm[4], tm[5]
                runs.append((t, x * cm[0] + y * cm[2] + cm[4], height - (x * cm[1] + y * cm[3] + cm[5])))
        page.extract_text(visitor_text=visit)
        out.append({"runs": runs, "text": page.extract_text()})
    return out


@pytest.fixture(scope="module")
def sample_pdf() -> bytes:
    return render_invoice_pdf(*sample_models())


@pytest.mark.parametrize("text,x,baseline", REFERENCE)
def test_matches_original_layout(sample_pdf, text, x, baseline):
    runs = positions(sample_pdf)[0]["runs"]
    hits = [(rx, ry) for t, rx, ry in runs if t.startswith(text.split(" ")[0]) and abs(ry - baseline) < 0.6]
    assert hits, f"{text!r} not found near y={baseline}"
    assert min(abs(rx - x) for rx, _ in hits) < 0.6, (text, hits)


def test_long_invoice_paginates_like_original():
    inv, s = sample_models()
    base = inv.items
    inv.items = [LineItem(invoice_id=0, position=n, description=base[n % 3].description, work_from=base[n % 3].work_from,
                          work_to=base[n % 3].work_to, quantity=10 + n, unit_price=19.99) for n in range(26)]
    inv.items[4].description = ("A very long single line description that keeps going well past the width "
                                "of the column so it wraps several times")
    inv.tax_rate = 7.5
    pages = positions(render_invoice_pdf(inv, s))
    assert len(pages) == 2
    # the original broke after row 15 and repeated the table header at the top of page 2
    assert any(t.strip() == "16" and abs(y - 62.95) < 0.6 for t, _, y in pages[1]["runs"])
    assert any(t.startswith("Item description") and abs(y - 40.8) < 0.6 for t, _, y in pages[1]["runs"])
    assert any(t.startswith("Subtotal") and abs(y - 473.39) < 0.6 for t, _, y in pages[1]["runs"])
    assert "1/2 for invoice" in pages[0]["text"] and "2/2 for invoice" in pages[1]["text"]
    assert "Total tax (7.5%)" in pages[1]["text"]


def test_formatting_matches_original():
    assert fmt_date(date(2026, 10, 5)) == "5 Oct 2026"
    assert fmt_period(date(2026, 9, 1), date(2026, 9, 15)) == "09/01 – 09/15"
    assert fmt_period(None, date(2026, 9, 15)) == "09/15"
    assert fmt_plain(60.0) == "60" and fmt_plain(7.5) == "7.5"


def test_wrap_keeps_enter_and_never_hyphenates():
    _register_fonts()
    assert wrap("one\ntwo", 9.75, 183) == ["one", "two"]
    lines = wrap("x" * 200, 9.75, 50)
    assert len(lines) > 1 and "".join(lines) == "x" * 200


def test_money_is_in_cents_with_tax_per_line():
    t = money.totals([(1, 0.105), (1, 0.105)], 10)
    assert t["amounts"] == [0.11, 0.11]  # half-up, like Math.round in the browser
    assert t["taxes"] == [0.01, 0.01] and t["total"] == 0.24
