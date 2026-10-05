from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlmodel import Session, select

from ..auth import current_user, ensure_settings
from ..db import get_session
from ..models import Client, Invoice, InvoiceStatus, LineItem, User
from ..pdf import render_invoice_pdf
from ..schemas import DashboardOut, InvoiceIn, InvoiceOut
from ..services import default_due, invoice_out, invoice_summary, next_invoice_number, refresh_overdue, replace_items

router = APIRouter(prefix="/invoices", tags=["invoices"])


def _owned(session: Session, user: User, invoice_id: int) -> Invoice:
    inv = session.get(Invoice, invoice_id)
    if not inv or inv.user_id != user.id:
        raise HTTPException(404, "Invoice not found")
    return inv


@router.get("", response_model=DashboardOut)
def list_invoices(q: str = "", status: str = "", user: User = Depends(current_user),
                  session: Session = Depends(get_session)):
    refresh_overdue(session, user)
    s = ensure_settings(session, user)
    rows = session.exec(select(Invoice).where(Invoice.user_id == user.id).order_by(Invoice.issued_on.desc(), Invoice.id.desc())).all()
    today = date.today()
    outstanding = [i for i in rows if i.status in (InvoiceStatus.sent, InvoiceStatus.overdue)]
    overdue = [i for i in rows if i.status == InvoiceStatus.overdue]
    paid_month = [i for i in rows if i.status == InvoiceStatus.paid and i.updated_at.year == today.year and i.updated_at.month == today.month]
    shown = rows
    if status:
        shown = [i for i in shown if i.status.value == status]
    if q:
        ql = q.lower()
        shown = [i for i in shown if ql in i.number.lower() or (i.client and ql in i.client.name.lower()) or ql in f"{i.total:.2f}"]
    return DashboardOut(
        outstanding=round(sum(i.total for i in outstanding), 2), outstanding_count=len(outstanding),
        paid_this_month=round(sum(i.total for i in paid_month), 2), paid_this_month_count=len(paid_month),
        overdue=round(sum(i.total for i in overdue), 2), overdue_count=len(overdue),
        currency=s.currency, invoices=[invoice_summary(i) for i in shown],
    )


@router.post("", response_model=InvoiceOut, status_code=201)
def create_invoice(user: User = Depends(current_user), session: Session = Depends(get_session)):
    """'New invoice': assigns the next number and the default client, and bumps the counter."""
    s = ensure_settings(session, user)
    today = date.today()
    inv = Invoice(user_id=user.id, number=next_invoice_number(s), issued_on=today, due_on=default_due(today, s),
                  currency=s.currency, tax_rate=s.tax_rate, client_id=s.default_client_id)
    s.next_number += 1
    session.add_all([inv, s])
    session.commit()
    session.refresh(inv)
    inv.items = [LineItem(invoice_id=inv.id, position=0, work_from=today, work_to=today, quantity=1, unit_price=0)]
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return invoice_out(inv)


@router.get("/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, user: User = Depends(current_user), session: Session = Depends(get_session)):
    return invoice_out(_owned(session, user, invoice_id))


@router.put("/{invoice_id}", response_model=InvoiceOut)
def save_invoice(invoice_id: int, body: InvoiceIn, user: User = Depends(current_user),
                 session: Session = Depends(get_session)):
    """Autosave target: the editor PUTs the whole invoice after each debounced change."""
    inv = _owned(session, user, invoice_id)
    s = ensure_settings(session, user)
    if body.client_id is not None:
        c = session.get(Client, body.client_id)
        if not c or c.user_id != user.id:
            raise HTTPException(400, "Unknown client")
    inv.number = body.number
    inv.client_id = body.client_id
    inv.status = body.status
    inv.issued_on = body.issued_on
    inv.due_is_manual = body.due_is_manual
    inv.due_on = body.due_on if (body.due_is_manual and body.due_on) else default_due(body.issued_on, s)
    inv.payment_link = body.payment_link
    inv.tax_rate = s.tax_rate if body.tax_rate is None else body.tax_rate
    inv.notes = body.notes
    inv.updated_at = datetime.now(timezone.utc)
    replace_items(session, inv, body.items)
    session.commit()
    session.refresh(inv)
    return invoice_out(inv)


@router.post("/{invoice_id}/status/{new_status}", response_model=InvoiceOut)
def set_status(invoice_id: int, new_status: InvoiceStatus, user: User = Depends(current_user),
               session: Session = Depends(get_session)):
    inv = _owned(session, user, invoice_id)
    inv.status = new_status
    inv.updated_at = datetime.now(timezone.utc)
    session.add(inv)
    session.commit()
    session.refresh(inv)
    return invoice_out(inv)


@router.delete("/{invoice_id}", status_code=204)
def delete_invoice(invoice_id: int, user: User = Depends(current_user), session: Session = Depends(get_session)):
    session.delete(_owned(session, user, invoice_id))
    session.commit()
    return Response(status_code=204)


@router.get("/{invoice_id}/pdf")
def invoice_pdf(invoice_id: int, inline: bool = False, user: User = Depends(current_user),
                session: Session = Depends(get_session)):
    """The invoice as a PDF. `?inline=true` opens it in the browser instead of downloading."""
    inv = _owned(session, user, invoice_id)
    pdf = render_invoice_pdf(inv, ensure_settings(session, user))
    disposition = "inline" if inline else "attachment"
    return Response(pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'{disposition}; filename="{inv.number}.pdf"'})
