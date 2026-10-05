export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface User { id: number; email: string | null; name: string; is_guest: boolean; onboarded: boolean }

export interface Settings {
  business_name: string; business_email: string; business_address: string; tax_id: string;
  bank_name: string; account_holder: string; account_number: string; routing_number: string; iban: string; bic: string;
  currency: string; payment_terms_days: number; tax_rate: number; show_payment_link: boolean;
  number_format: string; next_number: number; default_client_id: number | null; next_number_preview: string;
}

export interface Client {
  id: number; name: string; attention: string; address: string; email: string; archived: boolean;
  invoice_count: number; outstanding: number;
}

export interface LineItem {
  id?: number; key: string; description: string; work_from: string | null; work_to: string | null;
  quantity: number | string; unit_price: number | string;
}

export interface Warning { field: string; message: string }

export interface Invoice {
  id: number; number: string; status: InvoiceStatus; client_id: number | null; client_name: string | null;
  issued_on: string; due_on: string; due_is_manual: boolean; payment_link: string; currency: string; tax_rate: number;
  notes: string; items: LineItem[]; subtotal: number; tax: number; total: number; warnings: Warning[]; updated_at: string;
}

export interface InvoiceSummary {
  id: number; number: string; status: InvoiceStatus; client_name: string | null; issued_on: string; due_on: string;
  total: number; currency: string;
}

export interface Dashboard {
  outstanding: number; outstanding_count: number; paid_this_month: number; paid_this_month_count: number;
  overdue: number; overdue_count: number; currency: string; invoices: InvoiceSummary[];
}
