"""The original invoice's fixed details (formerly src/config.js), and a command to load them into an account.

    python -m app.seed --email you@example.com --password "a-long-password"

Creates the account if needed (or updates it), fills Settings with the seller and bank details,
adds RADIIA as the default client and creates INV-00017 with the three original line items.
`python -m app.sample` renders the same data to a PDF without touching the database.
"""
import argparse
from datetime import date

from sqlmodel import Session, select

from .auth import ensure_settings, hash_password
from .db import engine, init_db
from .models import Client, Invoice, LineItem, User

SETTINGS = {
    "business_name": "Serhii Chornyi",
    "business_address": "Haharina str. 36 fl. 1\n70433, Novoolexandrivka, Ukraine",
    "business_email": "chernysergiy@gmail.com",
    "tax_id": "",
    "account_holder": "Serhii Chornyi",
    "account_number": "70587950001841509",
    "routing_number": "031100209",
    "bank_name": "Citibank",
    "iban": "",
    "bic": "",
    "currency": "USD",
    "payment_terms_days": 7,
    "tax_rate": 0.0,
    "show_payment_link": True,
    "number_format": "INV-{00000}",
}
FIRST_NUMBER = 17

# The PDF prints the address lines under the client name; the email sits in them like on the original.
CLIENT = {
    "name": "RADIIA",
    "attention": "",
    "address": "New York NY\njennifer@raiida.co\nUnited States of America\nNew York, 10036",
    "email": "jennifer@raiida.co",
}

ITEMS = [
    {"description": "Implement reports, dashboard panels\n+ inventory filter/export features",
     "work_from": date(2026, 9, 1), "work_to": date(2026, 9, 7), "quantity": 60, "unit_price": 20},
    {"description": "Implement document editing, PDF\ntemplate + SKU lookup features",
     "work_from": date(2026, 9, 8), "work_to": date(2026, 9, 14), "quantity": 60, "unit_price": 20},
    {"description": "Implement Brand Out document, memo\nline marks + diamond list column features",
     "work_from": date(2026, 9, 15), "work_to": date(2026, 9, 21), "quantity": 60, "unit_price": 20},
]


def seed(email: str, password: str, name: str) -> None:
    init_db()
    with Session(engine) as session:
        user = session.exec(select(User).where(User.email == email.lower())).first()
        if user is None:
            user = User(email=email.lower(), name=name)
        user.password_hash = hash_password(password)
        user.onboarded = True
        session.add(user)
        session.commit()
        session.refresh(user)

        s = ensure_settings(session, user)
        client = session.exec(select(Client).where(Client.user_id == user.id, Client.name == CLIENT["name"])).first()
        if client is None:
            client = Client(user_id=user.id, **CLIENT)
            session.add(client)
            session.commit()
            session.refresh(client)
        for k, v in SETTINGS.items():
            setattr(s, k, v)
        s.default_client_id = client.id

        number = SETTINGS["number_format"].replace("{00000}", str(FIRST_NUMBER).zfill(5))
        if not session.exec(select(Invoice).where(Invoice.user_id == user.id, Invoice.number == number)).first():
            inv = Invoice(user_id=user.id, client_id=client.id, number=number, issued_on=date(2026, 9, 23),
                          due_on=date(2026, 9, 26), due_is_manual=True, currency=s.currency, tax_rate=s.tax_rate)
            session.add(inv)
            session.commit()
            session.refresh(inv)
            inv.items = [LineItem(invoice_id=inv.id, position=n, **it) for n, it in enumerate(ITEMS)]
            session.add(inv)
        s.next_number = max(s.next_number, FIRST_NUMBER + 1)
        session.add(s)
        session.commit()
    print(f"Seeded {email}: settings, client {CLIENT['name']} and invoice {number}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--email", required=True)
    ap.add_argument("--password", required=True, help="at least 10 characters")
    ap.add_argument("--name", default=SETTINGS["business_name"])
    a = ap.parse_args()
    if len(a.password) < 10:
        ap.error("the password needs at least 10 characters")
    seed(a.email, a.password, a.name)
