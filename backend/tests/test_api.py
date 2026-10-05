"""End-to-end smoke test over the HTTP API with a throwaway SQLite file."""
import os

os.environ["DATABASE_URL"] = "sqlite:///./test_invoice_studio.db"

from io import BytesIO

import pytest
from pypdf import PdfReader
from fastapi.testclient import TestClient

from app.db import engine, init_db
from app.main import app


@pytest.fixture(scope="module")
def client():
    if os.path.exists("test_invoice_studio.db"):
        os.remove("test_invoice_studio.db")
    init_db()
    with TestClient(app) as c:
        yield c
    engine.dispose()  # release the SQLite file (Windows won't delete an open file)
    os.remove("test_invoice_studio.db")


def auth(c, token):
    return {"Authorization": f"Bearer {token}"}


def test_full_flow(client):
    r = client.post("/api/auth/register", json={"name": "Sam", "email": "sam@example.com", "password": "correct-horse-battery", "business_name": "Acme Studio"})
    assert r.status_code == 201
    h = auth(client, r.json()["access_token"])

    r = client.put("/api/settings", json={"payment_terms_days": 7, "tax_rate": 0, "number_format": "INV-{0000}", "next_number": 42,
                                          "account_holder": "Sam Doe", "account_number": "12345678", "routing_number": "031100209"}, headers=h)
    assert r.json()["next_number_preview"] == "INV-0042"

    r = client.post("/api/clients", json={"name": "Northwind Co.", "attention": "Attn: Accounts Payable", "address": "45 Sample Road\n0000 Testville"}, headers=h)
    cid = r.json()["id"]

    r = client.post("/api/invoices", headers=h)
    inv = r.json()
    assert inv["number"] == "INV-0042"
    assert (inv["due_on"] > inv["issued_on"])

    body = {
        "number": inv["number"], "client_id": cid, "status": "draft", "issued_on": "2026-10-05", "due_is_manual": False,
        "payment_link": "https://pay.example.com/acme/0042",
        "items": [
            {"description": "Brand identity refresh", "work_from": "2026-09-01", "work_to": "2026-09-19", "quantity": 1, "unit_price": 4800},
            {"description": "Website design", "work_from": "2026-09-08", "work_to": "2026-09-30", "quantity": 12, "unit_price": 320},
            {"description": "Art direction", "work_from": "2026-09-23", "work_to": "2026-09-22", "quantity": 2, "unit_price": 640},
        ],
    }
    r = client.put(f"/api/invoices/{inv['id']}", json=body, headers=h)
    saved = r.json()
    assert saved["due_on"] == "2026-10-12"           # issued + 7 days
    assert saved["total"] == 4800 + 3840 + 1280
    assert any(w["field"].endswith("work_to") for w in saved["warnings"])  # inverted period is a warning, not an error

    r = client.put(f"/api/invoices/{inv['id']}", json={**body, "payment_link": "not a link"}, headers=h)
    assert r.status_code == 422                      # a link that is not a URL is rejected

    r = client.get("/api/invoices", headers=h)
    assert r.json()["invoices"][0]["number"] == "INV-0042"

    r = client.get(f"/api/invoices/{inv['id']}/pdf", headers=h)
    assert r.headers["content-type"] == "application/pdf"
    assert r.headers["content-disposition"].startswith("attachment")
    text = PdfReader(BytesIO(r.content)).pages[0].extract_text()
    for expected in ["Invoice #INV-0042", "Northwind Co.", "Total payment", "9,920.00 USD", "09/01 – 09/19",
                     "Account number: 12345678", "Routing number: 031100209", "via link:", "1/1 for invoice #INV-0042"]:
        assert expected in text, expected
    r = client.get(f"/api/invoices/{inv['id']}/pdf?inline=true", headers=h)
    assert r.headers["content-disposition"].startswith("inline")

    r = client.post("/api/auth/guest")
    assert r.status_code == 201
    r = client.get(f"/api/invoices/{inv['id']}", headers=auth(client, r.json()["access_token"]))
    assert r.status_code == 404                      # other users can't see it
