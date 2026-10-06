"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { Dashboard, InvoiceStatus, InvoiceSummary } from "@/lib/types";
import { fmtDate, money } from "@/lib/invoice";
import { Icon } from "@/components/Icon";
import { Badge, Dialog, Skeleton } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { DataTable, type Column } from "@/components/DataTable";

const filters: Array<{ v: "" | InvoiceStatus; label: string }> = [
  { v: "", label: "All" }, { v: "draft", label: "Draft" }, { v: "sent", label: "Sent" }, { v: "paid", label: "Paid" }, { v: "overdue", label: "Overdue" },
];

const columns: Column<InvoiceSummary>[] = [
  { id: "number", header: "Number", width: 130, sortValue: (r) => r.number, skeleton: <Skeleton w={72} />,
    cell: (r) => <Link href={`/invoices/${r.id}`} className="num" style={{ fontWeight: 600, color: "inherit", textDecoration: "none", whiteSpace: "nowrap" }}>{r.number}</Link> },
  { id: "client", header: "Client", grow: true, sortValue: (r) => (r.client_name ?? "").toLowerCase(), skeleton: <Skeleton w="55%" />,
    cell: (r) => (
      <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--sunken)", color: "var(--fg-2)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flex: "0 0 24px" }}>{(r.client_name ?? "?").charAt(0)}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.client_name ?? <span className="help">No client</span>}</span>
      </span>
    ) },
  { id: "issued", header: "Issued", width: 130, hideOnMobile: true, sortValue: (r) => r.issued_on, skeleton: <Skeleton w={76} />,
    cell: (r) => <span className="num" style={{ color: "var(--fg-2)" }}>{fmtDate(r.issued_on)}</span> },
  { id: "due", header: "Due", width: 130, hideOnMobile: true, sortValue: (r) => r.due_on, skeleton: <Skeleton w={76} />,
    cell: (r) => <span className="num" style={{ color: "var(--fg-2)" }}>{fmtDate(r.due_on)}</span> },
  { id: "status", header: "Status", width: 110, hideOnMobile: true, sortValue: (r) => r.status, skeleton: <Skeleton w={60} h={24} r={999} />,
    cell: (r) => <Badge status={r.status} /> },
  { id: "amount", header: "Amount", width: 150, align: "right", sortValue: (r) => r.total, skeleton: <Skeleton w={80} style={{ marginLeft: "auto" }} />,
    cell: (r) => <span className="num" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{money(r.total, r.currency)}</span> },
];

export default function InvoicesPage() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<Dashboard | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | InvoiceStatus>("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ rows: InvoiceSummary[]; done?: () => void } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => api.invoices.list(q, status).then(setData).catch((e) => toast.push({ kind: "error", text: e.message })), [q, status, toast]);
  useEffect(() => { const t = setTimeout(load, q ? 250 : 0); return () => clearTimeout(t); }, [load, q]);

  const createInvoice = async () => {
    setCreating(true);
    try { const inv = await api.invoices.create(); router.push(`/invoices/${inv.id}`); }
    catch (e) { toast.push({ kind: "error", text: (e as Error).message }); setCreating(false); }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { rows, done } = pendingDelete;
    const results = await Promise.allSettled(rows.map((r) => api.invoices.remove(r.id)));
    const failed = results.filter((r) => r.status === "rejected").length, ok = rows.length - failed;
    if (ok) toast.push({ kind: "success", text: ok === 1 && rows.length === 1 ? `${rows[0].number} deleted` : `${ok} invoice${ok === 1 ? "" : "s"} deleted` });
    if (failed) toast.push({ kind: "error", text: `Couldn't delete ${failed} invoice${failed === 1 ? "" : "s"}` });
    done?.(); setPendingDelete(null); setDeleting(false);
    load();
  };

  const firstRun = data && data.invoices.length === 0 && !q && !status;
  const cur = data?.currency ?? "USD";
  const month = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <main className="main">
      {firstRun ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 0" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 28, maxWidth: 460 }}>
            <img className="float" src="/img/folio-wave.svg" alt="Folio, a smiling sheet of paper, waving and holding a paid invoice" style={{ width: 300, marginBottom: -24 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h1 className="display" style={{ margin: 0, fontSize: 44 }}>Your first invoice is a minute away.</h1>
              <p style={{ margin: 0, color: "var(--fg-2)", fontSize: 15, lineHeight: 1.55 }}>Fill in a few fields, watch the PDF take shape beside you, and download it. Your business and bank details are saved once in Settings.</p>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <button className="btn btn-primary btn-lg" onClick={createInvoice} disabled={creating}><Icon name="plus" strokeWidth={2} />New invoice</button>
              <Link href="/settings" className="btn btn-secondary btn-lg">Add business details</Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 className="display" style={{ margin: 0, fontSize: 44 }}>Invoices</h1>
              <p style={{ margin: "8px 0 0", color: "var(--fg-3)" }}>{month}{data ? ` · ${data.invoices.length} invoice${data.invoices.length === 1 ? "" : "s"}` : ""}</p>
            </div>
            <button className="btn btn-primary" onClick={createInvoice} disabled={creating}><Icon name="plus" strokeWidth={2} />New invoice</button>
          </div>

          <div className="tiles">
            {data ? (
              <>
                <Tile label="Outstanding" value={money(data.outstanding, cur)} sub={`${data.outstanding_count} invoice${data.outstanding_count === 1 ? "" : "s"} awaiting payment`} />
                <Tile label="Paid this month" value={money(data.paid_this_month, cur)} sub={`${data.paid_this_month_count} invoice${data.paid_this_month_count === 1 ? "" : "s"}`} />
                <Tile label="Overdue" value={money(data.overdue, cur)} sub={`${data.overdue_count} invoice${data.overdue_count === 1 ? "" : "s"} past due`} tone="var(--overdue)" />
              </>
            ) : [0, 1, 2].map((i) => <div key={i} className="card tile"><Skeleton w={90} h={12} /><Skeleton w={140} h={30} /><Skeleton w={120} h={10} /></div>)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label className="sr-only" htmlFor="q">Search invoices</label>
              <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
                <Icon name="search" style={{ position: "absolute", left: 12, top: 12, color: "var(--fg-3)" }} strokeWidth={2} />
                <input id="q" className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search number, client or amount" style={{ paddingLeft: 36 }} />
              </div>
              <div role="group" aria-label="Filter by status" style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {filters.map((f) => <button key={f.v} className={`chip ${status === f.v ? "on" : ""}`} onClick={() => setStatus(f.v)}>{f.label}</button>)}
              </div>
            </div>

            <DataTable
              rows={data?.invoices ?? null}
              columns={columns}
              rowKey={(r) => r.id}
              rowLabel={(r) => r.number}
              onRowClick={(r, e) => (e.metaKey || e.ctrlKey ? window.open(`/invoices/${r.id}`, "_blank") : router.push(`/invoices/${r.id}`))}
              selectable
              bulkActions={(rows, clear) => (
                <button type="button" className="btn btn-danger" style={{ height: 32 }} onClick={() => setPendingDelete({ rows, done: clear })}>
                  <Icon name="trash" size={15} strokeWidth={2} />Delete selected
                </button>
              )}
              onRemove={(r) => setPendingDelete({ rows: [r] })}
              removeLabel="Delete"
              storageKey="invoice-studio:invoices-page-size"
              resetKey={`${q}|${status}`}
              empty="No invoices match."
            />
          </div>
        </>
      )}

      {pendingDelete && (
        <Dialog
          title={pendingDelete.rows.length === 1 ? `Delete ${pendingDelete.rows[0].number}?` : `Delete ${pendingDelete.rows.length} invoices?`}
          onClose={() => !deleting && setPendingDelete(null)}
          actions={<>
            <button className="btn btn-ghost" autoFocus disabled={deleting} onClick={() => setPendingDelete(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ background: "var(--overdue)", borderColor: "var(--overdue)" }} disabled={deleting} onClick={confirmDelete}>{deleting ? "Deleting…" : "Delete"}</button>
          </>}>
          {pendingDelete.rows.length === 1 ? "This invoice is" : "These invoices are"} removed for good, with {pendingDelete.rows.length === 1 ? "its" : "their"} line items. Invoice numbers are not reused.
        </Dialog>
      )}
    </main>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="card tile">
      <span style={{ fontSize: 13, color: tone ?? "var(--fg-2)", fontWeight: 600 }}>{label}</span>
      <span className="num display" style={{ fontSize: 36 }}>{value}</span>
      <span style={{ fontSize: 13, color: "var(--fg-3)" }}>{sub}</span>
    </div>
  );
}
