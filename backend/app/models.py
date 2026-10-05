"""Database tables. One user owns settings, clients and invoices."""
from datetime import date, datetime, timezone
from enum import Enum

from sqlmodel import Field, Relationship, SQLModel

from . import money


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class InvoiceStatus(str, Enum):
    draft = "draft"
    sent = "sent"
    paid = "paid"
    overdue = "overdue"


class User(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str | None = Field(default=None, index=True, unique=True)
    name: str = ""
    password_hash: str | None = None
    is_guest: bool = False
    onboarded: bool = False
    created_at: datetime = Field(default_factory=utcnow)

    settings: "BusinessSettings" = Relationship(back_populates="user", sa_relationship_kwargs={"uselist": False})
    clients: list["Client"] = Relationship(back_populates="user")
    invoices: list["Invoice"] = Relationship(back_populates="user")


class BusinessSettings(SQLModel, table=True):
    """The fixed details that print on every invoice (previously a config file)."""

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True, unique=True)

    business_name: str = "Acme Studio"
    business_email: str = ""
    business_address: str = ""
    tax_id: str = ""

    # Printed as the "Account details" block; empty fields are left off.
    bank_name: str = ""
    account_holder: str = ""
    account_number: str = ""
    routing_number: str = ""
    iban: str = ""
    bic: str = ""

    currency: str = "USD"
    payment_terms_days: int = 7
    tax_rate: float = 0.0
    show_payment_link: bool = True
    number_format: str = "INV-{00000}"
    next_number: int = 1
    default_client_id: int | None = Field(default=None, foreign_key="client.id")

    user: User = Relationship(back_populates="settings")


class Client(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    name: str
    attention: str = ""
    address: str = ""
    email: str = ""
    archived: bool = False
    created_at: datetime = Field(default_factory=utcnow)

    user: User = Relationship(back_populates="clients")
    invoices: list["Invoice"] = Relationship(back_populates="client")


class Invoice(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    client_id: int | None = Field(default=None, foreign_key="client.id")

    number: str = Field(index=True)
    status: InvoiceStatus = InvoiceStatus.draft
    issued_on: date
    due_on: date
    due_is_manual: bool = False
    payment_link: str = ""
    currency: str = "USD"
    tax_rate: float = 0.0
    notes: str = ""
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    user: User = Relationship(back_populates="invoices")
    client: Client | None = Relationship(back_populates="invoices")
    items: list["LineItem"] = Relationship(
        back_populates="invoice",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "order_by": "LineItem.position"},
    )

    def totals(self) -> dict:
        return money.totals(((i.quantity, i.unit_price) for i in self.items), self.tax_rate)

    @property
    def subtotal(self) -> float:
        return self.totals()["subtotal"]

    @property
    def tax(self) -> float:
        return self.totals()["tax"]

    @property
    def total(self) -> float:
        return self.totals()["total"]


class LineItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    invoice_id: int = Field(foreign_key="invoice.id", index=True)
    position: int = 0
    description: str = ""
    work_from: date | None = None
    work_to: date | None = None
    quantity: float = 1
    unit_price: float = 0

    invoice: Invoice = Relationship(back_populates="items")

    @property
    def amount(self) -> float:
        return money.amount_cents(self.quantity, self.unit_price) / 100


class PasswordReset(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", index=True)
    token: str = Field(index=True, unique=True)
    expires_at: datetime
    used: bool = False
