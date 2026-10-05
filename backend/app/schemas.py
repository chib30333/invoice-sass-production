"""Request / response shapes. Validation mirrors the inline warnings in the UI."""
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator, model_validator

from .models import InvoiceStatus


# ---- auth -------------------------------------------------------------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=10, max_length=200)
    business_name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str | None
    name: str
    is_guest: bool
    onboarded: bool


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=10, max_length=200)


# ---- settings ---------------------------------------------------------------
class SettingsOut(BaseModel):
    business_name: str
    business_email: str
    business_address: str
    tax_id: str
    bank_name: str
    account_holder: str
    account_number: str
    routing_number: str
    iban: str
    bic: str
    currency: str
    payment_terms_days: int
    tax_rate: float
    show_payment_link: bool
    number_format: str
    next_number: int
    default_client_id: int | None
    next_number_preview: str


class SettingsIn(BaseModel):
    business_name: str | None = None
    business_email: str | None = None
    business_address: str | None = None
    tax_id: str | None = None
    bank_name: str | None = None
    account_holder: str | None = None
    account_number: str | None = None
    routing_number: str | None = None
    iban: str | None = None
    bic: str | None = None
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    payment_terms_days: int | None = Field(default=None, ge=0, le=365)
    tax_rate: float | None = Field(default=None, ge=0, le=100)
    show_payment_link: bool | None = None
    number_format: str | None = None
    next_number: int | None = Field(default=None, ge=1)
    default_client_id: int | None = None


# ---- clients ----------------------------------------------------------------
class ClientIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    attention: str = ""
    address: str = ""
    email: str = ""


class ClientOut(ClientIn):
    id: int
    archived: bool
    invoice_count: int = 0
    outstanding: float = 0.0


# ---- invoices ---------------------------------------------------------------
class LineItemIn(BaseModel):
    id: int | None = None
    description: str = ""
    work_from: date | None = None
    work_to: date | None = None
    quantity: float = Field(default=1, ge=0)
    unit_price: float = Field(default=0, ge=0)

    @model_validator(mode="after")
    def period_order(self):
        # The UI shows this as a warning; the API treats it the same way (non-blocking).
        return self


class LineItemOut(LineItemIn):
    id: int
    position: int
    amount: float


class InvoiceIn(BaseModel):
    number: str = Field(min_length=1, max_length=40)
    client_id: int | None = None
    status: InvoiceStatus = InvoiceStatus.draft
    issued_on: date
    due_on: date | None = None
    due_is_manual: bool = False
    payment_link: str = ""
    tax_rate: float | None = None
    notes: str = ""
    items: list[LineItemIn] = []

    @field_validator("payment_link")
    @classmethod
    def link_looks_like_url(cls, v: str) -> str:
        v = v.strip()
        if v:
            HttpUrl(v)  # raises if it is not a URL
        return v


class Warning(BaseModel):
    field: str
    message: str


class InvoiceOut(BaseModel):
    id: int
    number: str
    status: InvoiceStatus
    client_id: int | None
    client_name: str | None
    issued_on: date
    due_on: date
    due_is_manual: bool
    payment_link: str
    currency: str
    tax_rate: float
    notes: str
    items: list[LineItemOut]
    subtotal: float
    tax: float
    total: float
    warnings: list[Warning]
    updated_at: datetime


class InvoiceSummary(BaseModel):
    id: int
    number: str
    status: InvoiceStatus
    client_name: str | None
    issued_on: date
    due_on: date
    total: float
    currency: str


class DashboardOut(BaseModel):
    outstanding: float
    outstanding_count: int
    paid_this_month: float
    paid_this_month_count: int
    overdue: float
    overdue_count: int
    currency: str
    invoices: list[InvoiceSummary]
