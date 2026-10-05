"""Money maths in whole cents (no float drift), with tax per line like the original invoice.

frontend/src/lib/invoice.ts `totals()` does the same so the live preview matches the PDF.
"""
from collections.abc import Iterable
from decimal import ROUND_HALF_UP, Decimal


def _dec(v: float | int | str) -> Decimal:
    return Decimal(str(v or 0))


def _round(d: Decimal) -> int:
    return int(d.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def amount_cents(quantity: float, unit_price: float) -> int:
    return _round(_dec(quantity) * _dec(unit_price) * 100)


def tax_cents(amount: int, tax_rate: float) -> int:
    return _round(Decimal(amount) * _dec(tax_rate) / 100)


def totals(lines: Iterable[tuple[float, float]], tax_rate: float) -> dict:
    """lines: (quantity, unit_price) pairs -> per-line amounts/taxes plus subtotal, tax and total (all in units)."""
    amounts = [amount_cents(q, p) for q, p in lines]
    taxes = [tax_cents(a, tax_rate) for a in amounts]
    subtotal, tax = sum(amounts), sum(taxes)
    return {
        "amounts": [a / 100 for a in amounts],
        "taxes": [t / 100 for t in taxes],
        "subtotal": subtotal / 100,
        "tax": tax / 100,
        "total": (subtotal + tax) / 100,
    }
