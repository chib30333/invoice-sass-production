/* Thin fetch wrapper: bearer token from localStorage, JSON in/out, typed errors. */
import type { Client, Dashboard, Invoice, LineItem, Settings, User } from "./types";

const TOKEN_KEY = "invoice-studio:token";

export const token = {
  get: () => (typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY)),
  set: (t: string) => window.localStorage.setItem(TOKEN_KEY, t),
  clear: () => window.localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`/api${path}`, { ...init, headers });
  if (res.status === 204) return undefined as T;
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : await res.blob();
  if (!res.ok) {
    const detail = isJson ? (body as { detail?: unknown }).detail : undefined;
    const message = typeof detail === "string" ? detail : Array.isArray(detail) ? detail.map((d: { msg: string }) => d.msg).join(", ") : res.statusText;
    throw new ApiError(res.status, message, detail);
  }
  return body as T;
}

const json = (body: unknown) => JSON.stringify(body);

export const api = {
  auth: {
    register: (b: { name: string; email: string; password: string; business_name: string }) => request<{ access_token: string }>("/auth/register", { method: "POST", body: json(b) }),
    login: (b: { email: string; password: string }) => request<{ access_token: string }>("/auth/login", { method: "POST", body: json(b) }),
    guest: () => request<{ access_token: string }>("/auth/guest", { method: "POST" }),
    me: () => request<User>("/auth/me"),
    onboarded: () => request<User>("/auth/onboarded", { method: "POST" }),
    forgot: (email: string) => request<{ ok: true }>("/auth/forgot", { method: "POST", body: json({ email }) }),
    reset: (b: { token: string; password: string }) => request<{ access_token: string }>("/auth/reset", { method: "POST", body: json(b) }),
  },
  settings: {
    get: () => request<Settings>("/settings"),
    update: (b: Partial<Settings>) => request<Settings>("/settings", { method: "PUT", body: json(b) }),
  },
  clients: {
    list: () => request<Client[]>("/clients"),
    create: (b: Pick<Client, "name" | "attention" | "address" | "email">) => request<Client>("/clients", { method: "POST", body: json(b) }),
    update: (id: number, b: Pick<Client, "name" | "attention" | "address" | "email">) => request<Client>(`/clients/${id}`, { method: "PUT", body: json(b) }),
    archive: (id: number) => request<Client>(`/clients/${id}/archive`, { method: "POST" }),
  },
  invoices: {
    list: (q = "", status = "") => request<Dashboard>(`/invoices?q=${encodeURIComponent(q)}&status=${status}`),
    create: () => request<Invoice>("/invoices", { method: "POST" }),
    get: (id: number) => request<Invoice>(`/invoices/${id}`),
    save: (id: number, b: InvoiceSaveBody) => request<Invoice>(`/invoices/${id}`, { method: "PUT", body: json(b) }),
    setStatus: (id: number, status: string) => request<Invoice>(`/invoices/${id}/status/${status}`, { method: "POST" }),
    remove: (id: number) => request<void>(`/invoices/${id}`, { method: "DELETE" }),
    pdf: (id: number, inline = false) => request<Blob>(`/invoices/${id}/pdf${inline ? "?inline=true" : ""}`),
  },
};

export interface InvoiceSaveBody {
  number: string; client_id: number | null; status: string; issued_on: string; due_on: string | null; due_is_manual: boolean;
  payment_link: string; tax_rate: number | null; notes: string;
  items: Array<Omit<LineItem, "key"> & { quantity: number; unit_price: number }>;
}
