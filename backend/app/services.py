"""Domain helpers shared by routers: numbering, due dates, warnings, serialisation."""
import re
from datetime import date, timedelta

from sqlmodel import Session, select

from .models import BusinessSettings, Client, Invoice, InvoiceStatus, LineItem, User
from .schemas import ClientOut, InvoiceOut, InvoiceSummary, LineItemOut, Warning

URL_RE = re.compile(r"^https?://[^\s/$.?#].[^\s]*$", re.I)


def format_number(fmt: str, n: int, today: date | None = None) -> str:
    """'INV-{0000}' -> 'INV-0042'; '{YYYY}' inserts the year."""
    today = today or date.today()
    out = fmt.replace("{YYYY}", str(today.year))
    m = re.search(r"\{(0+)\}", out)
    return out[: m.start()] + str(n).zfill(len(m.group(1))) + out[m.end():] if m else f"{out}{n}"


def next_invoice_number(s: BusinessSettings) -> str:
    return format_number(s.number_format, s.next_number)


def default_due(issued: date, s: BusinessSettings) -> date:
    return issued + timedelta(days=s.payment_terms_days)


def refresh_overdue(session: Session, user: User) -> None:
    """'Sent' invoices past their due date become 'overdue'; nothing else flips automatically."""
    today = date.today()
    rows = session.exec(select(Invoice).where(Invoice.user_id == user.id, Invoice.status == InvoiceStatus.sent)).all()
    changed = False
    for inv in rows:
        if inv.due_on < today:
            inv.status = InvoiceStatus.overdue
            session.add(inv)
            changed = True
    if changed:
        session.commit()


def warnings_for(inv: Invoice) -> list[Warning]:
    w: list[Warning] = []
    if not inv.number.strip():
        w.append(Warning(field="number", message="Add a number so this invoice can be filed."))
    if inv.due_on < inv.issued_on:
        w.append(Warning(field="due_on", message="Due date is before the issue date."))
    for it in inv.items:
        if it.work_from and it.work_to and it.work_to < it.work_from:
            w.append(Warning(field=f"items.{it.id}.work_to", message="The work period ends before it starts."))
    if inv.payment_link and not URL_RE.match(inv.payment_link):
        w.append(Warning(field="payment_link", message="This doesn't look like a link. It needs to start with https://"))
    return w


def invoice_out(inv: Invoice) -> InvoiceOut:
    return InvoiceOut(
        id=inv.id, number=inv.number, status=inv.status, client_id=inv.client_id,
        client_name=inv.client.name if inv.client else None,
        issued_on=inv.issued_on, due_on=inv.due_on, due_is_manual=inv.due_is_manual,
        payment_link=inv.payment_link, currency=inv.currency, tax_rate=inv.tax_rate, notes=inv.notes,
        items=[LineItemOut(id=i.id, position=i.position, description=i.description, work_from=i.work_from,
                           work_to=i.work_to, quantity=i.quantity, unit_price=i.unit_price, amount=i.amount)
               for i in inv.items],
        subtotal=inv.subtotal, tax=inv.tax, total=inv.total, warnings=warnings_for(inv), updated_at=inv.updated_at,
    )


def invoice_summary(inv: Invoice) -> InvoiceSummary:
    return InvoiceSummary(id=inv.id, number=inv.number, status=inv.status,
                          client_name=inv.client.name if inv.client else None,
                          issued_on=inv.issued_on, due_on=inv.due_on, total=inv.total, currency=inv.currency)


def client_out(c: Client) -> ClientOut:
    open_ = [i for i in c.invoices if i.status in (InvoiceStatus.sent, InvoiceStatus.overdue, InvoiceStatus.draft)]
    return ClientOut(id=c.id, name=c.name, attention=c.attention, address=c.address, email=c.email,
                     archived=c.archived, invoice_count=len(c.invoices),
                     outstanding=round(sum(i.total for i in open_), 2))


def replace_items(session: Session, inv: Invoice, items: list) -> None:
    """Rewrite the line items in the given order (ids are kept where they still exist)."""
    existing = {i.id: i for i in inv.items}
    kept: list[LineItem] = []
    for pos, it in enumerate(items):
        row = existing.get(it.id) if it.id else None
        if row is None:
            row = LineItem(invoice_id=inv.id)
        row.position = pos
        row.description = it.description
        row.work_from = it.work_from
        row.work_to = it.work_to
        row.quantity = it.quantity
        row.unit_price = it.unit_price
        kept.append(row)
    inv.items = kept
    session.add(inv)
