"""Render the original sample invoice (INV-00017) to a PDF without the database or the web app.

    python -m app.sample [out.pdf]
"""
import sys
from datetime import date
from pathlib import Path

from .models import BusinessSettings, Client, Invoice, LineItem
from .pdf import render_invoice_pdf
from .seed import CLIENT, ITEMS, SETTINGS

PAYMENT_LINK = "https://link.payoneer.com/Token?t=6219CC4C2C1B4E3F8CCA1257F3474F83"


def sample_models() -> tuple[Invoice, BusinessSettings]:
    """Unsaved model objects: the PDF goes through exactly the same path as in the app."""
    s = BusinessSettings(user_id=0, **SETTINGS)
    inv = Invoice(user_id=0, number="INV-00017", issued_on=date(2026, 9, 23), due_on=date(2026, 9, 26),
                  currency=s.currency, tax_rate=s.tax_rate, payment_link=PAYMENT_LINK)
    inv.client = Client(user_id=0, **CLIENT)
    inv.items = [LineItem(invoice_id=0, position=n, **it) for n, it in enumerate(ITEMS)]
    return inv, s


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "sample-invoice.pdf")
    out.write_bytes(render_invoice_pdf(*sample_models()))
    print("Wrote", out.resolve())
