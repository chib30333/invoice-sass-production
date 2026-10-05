# Invoice Studio

A premium invoice builder for freelancers and small studios: the Invoice Studio design system wrapped around the
original invoice generator. The app (accounts, clients, settings, dashboard, editor) comes from the design; the
invoice itself is the original **INV-00017** layout, measured in points, with Selawik standing in for Segoe UI.

- **frontend/** — Next.js 15 (App Router, TypeScript, React 19). No UI framework: the design tokens live in `src/app/globals.css`.
- **backend/** — FastAPI + SQLModel (SQLite by default), JWT auth (PyJWT + bcrypt), PDF rendering with ReportLab
  (pure Python, no system libraries), checked against the original react-pdf output in `tests/test_pdf.py`.

## Run it

### With Docker
```bash
docker compose up --build
# web: http://localhost:3000   api docs: http://localhost:8000/docs
```

### Locally
Backend (Python 3.11+):
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # set SECRET_KEY
uvicorn app.main:app --reload   # http://localhost:8000
pytest                          # API flow + PDF layout against the original invoice
```
Frontend:
```bash
cd frontend
npm install
npm run dev                     # http://localhost:3000 — /api/* is proxied to the backend
```
The first screen is the landing page. "Try it as a guest" creates a throwaway account so the editor works without signing up; register later to keep data.

### Start from the original invoice
The fixed details of the original generator (seller, bank "Account details", client RADIIA, `INV-{00000}` numbering,
the three September line items) live in `backend/app/seed.py`. Load them into an account:
```bash
cd backend
python -m app.seed --email you@example.com --password "a-long-password"   # then sign in with it
python -m app.sample sample-invoice.pdf                                   # INV-00017 as a PDF, no database needed
```

## What's where

| Design artboard | Code |
|---|---|
| Tokens, components | `frontend/src/app/globals.css`, `src/components/ui.tsx`, `Icon.tsx` |
| Landing page | `src/app/page.tsx` |
| Sign in / up / reset | `src/app/(auth)/*`, `src/components/AuthShell.tsx` |
| Invoices home (+ empty state, skeletons) | `src/app/(app)/invoices/page.tsx` |
| Invoice editor (live preview, parallax desk, drag-reorder, validation, autosave, download sequence) | `src/app/(app)/invoices/[id]/page.tsx`, `src/components/PdfSheet.tsx`, `LineItems.tsx` |
| Clients list + edit sheet | `src/app/(app)/clients/page.tsx` |
| Settings | `src/app/(app)/settings/page.tsx`, `src/components/SettingsForm.tsx` |
| Onboarding (3 steps) | `src/app/(app)/onboarding/page.tsx` |
| Command palette ⌘K, toasts, dialog, theme | `src/components/CommandPalette.tsx`, `Toast.tsx`, `ui.tsx`, `ThemeToggle.tsx` |
| The invoice document (original INV-00017 layout) | PDF: `backend/app/pdf.py` · live preview: `src/components/PdfSheet.tsx` (same measurements) |
| Money maths (cents, tax per line) | `backend/app/money.py`, `src/lib/invoice.ts` |
| Original fixed details + sample | `backend/app/seed.py`, `backend/app/sample.py` |
| Mascot + artwork | `frontend/public/img/` |

## Behaviour notes
- **Due date follows issued + payment terms** until edited by hand (`due_is_manual`); "Follow issue date" relinks it. The backend enforces the same rule.
- **Autosave**: the editor PUTs the whole invoice 1.4 s after the last change; the preview re-renders after 500 ms with the shimmer and region highlight.
- **Validation is non-blocking** (empty number, due before issued, inverted work period) and returned as `warnings` by the API; only a malformed payment link is rejected (422).
- **The invoice layout is the original one**: "Invoice #…", the To / Payment terms bars, an 8-column table (work period, quantity, price, amount, tax %, tax amount), Subtotal / Total tax / Total payment, your details and "Account details" pinned to the bottom of the last page, "Pay {total} via link: …", and a "1/2 for invoice #…" footer. Long invoices break between rows and repeat the table header.
- **Descriptions**: Enter starts a new line; long lines wrap on their own and words are never hyphenated.
- **Money** is computed in cents with tax per line (half-up rounding), identically in the browser and the API. The tax columns always print, also at 0 %.
- **Clients** print as name + attention + address lines; the email field is for your records (put it in the address if it should print, like the original).
- **Statuses**: `sent` invoices past their due date flip to `overdue` on read; `paid` is set manually from the editor's status menu.
- **Numbering**: `INV-{0000}` style format with `{YYYY}` support; numbers are assigned on create and never reused.
- **Reduced motion** is honoured globally; the sheet is flat and the shimmer is off.

## API
`/docs` on the backend lists everything. Main endpoints:
`POST /api/auth/{register,login,guest,forgot,reset}` · `GET /api/auth/me` · `GET|PUT /api/settings` · `GET|POST /api/clients`, `PUT /api/clients/{id}`, `POST /api/clients/{id}/archive` · `GET|POST /api/invoices`, `GET|PUT|DELETE /api/invoices/{id}`, `POST /api/invoices/{id}/status/{status}`, `GET /api/invoices/{id}/pdf` (`?inline=true` to view in the browser).

## Production notes
- Set a real `SECRET_KEY`; point `DATABASE_URL` at Postgres if you outgrow SQLite (SQLModel works with both).
- `POST /auth/forgot` logs the reset link instead of emailing it — wire your mailer there.
- UI fonts load through `next/font/google` at build time (Fredoka, Nunito, Geist Mono); the build machine needs internet access, or self-host them. The invoice font, Selawik (SIL OFL), ships in `backend/app/fonts/` and `frontend/public/fonts/`. With a Segoe UI licence, set `PDF_FONT_REGULAR` / `PDF_FONT_BOLD` to `segoeui.ttf` / `segoeuib.ttf`.
- New settings columns are added to an existing database on startup (`db.py`); for anything beyond adding columns, use a real migration tool.
