"use client";
import { useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import { Skeleton } from "./ui";

/* Reusable table: sortable columns, row checkboxes with bulk actions, per-row remove, pagination.
   Sorting and paging happen in the browser over the rows it is given. */

type Key = string | number;

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable by this value. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  width?: number | string;
  hideOnMobile?: boolean;
  /** Takes the leftover width; its content should truncate (ellipsis) rather than widen the table. */
  grow?: boolean;
  /** Placeholder while rows load; a text-width bar by default. */
  skeleton?: ReactNode;
}

interface Props<T> {
  rows: T[] | null; // null while loading
  columns: Column<T>[];
  rowKey: (row: T) => Key;
  /** Names a row for screen readers ("Select INV-00019", "Remove INV-00019"). */
  rowLabel: (row: T) => string;
  onRowClick?: (row: T, e: MouseEvent) => void;
  selectable?: boolean;
  /** Shown above the table while rows are selected; `clear` empties the selection. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  onRemove?: (row: T) => void;
  removeLabel?: string;
  pageSizes?: number[];
  defaultPageSize?: number;
  /** Remembers the chosen page size in this browser under this key. */
  storageKey?: string;
  /** Changing it (e.g. a search or filter) returns to the first page. */
  resetKey?: unknown;
  empty?: ReactNode;
}

export function DataTable<T>({
  rows, columns, rowKey, rowLabel, onRowClick, selectable, bulkActions, onRemove, removeLabel = "Remove",
  pageSizes = [10, 20, 50, 100], defaultPageSize = 20, storageKey, resetKey, empty = "Nothing here yet.",
}: Props<T>) {
  const [sort, setSort] = useState<{ id: string; dir: 1 | -1 } | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [selected, setSelected] = useState<Set<Key>>(new Set());

  useEffect(() => {
    if (!storageKey) return;
    try { const n = Number(localStorage.getItem(storageKey)); if (pageSizes.includes(n)) setPageSizeState(n); } catch { /* storage unavailable */ }
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const setPageSize = (n: number) => {
    setPageSizeState(n); setPage(1);
    if (storageKey) try { localStorage.setItem(storageKey, String(n)); } catch { /* storage unavailable */ }
  };

  useEffect(() => { setPage(1); }, [resetKey]);
  // Drop selections whose rows are gone (deleted, or filtered out).
  useEffect(() => {
    if (!rows) return;
    const live = new Set(rows.map(rowKey));
    setSelected((s) => { const next = new Set([...s].filter((k) => live.has(k))); return next.size === s.size ? s : next; });
  }, [rows, rowKey]);

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows ?? [];
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const v = col.sortValue;
    return [...rows].sort((a, b) => { const x = v(a), y = v(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }, [rows, sort, columns]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = (current - 1) * pageSize;
  const pageRows = sorted.slice(start, start + pageSize);

  const pageKeys = pageRows.map(rowKey);
  const pageSelected = pageKeys.filter((k) => selected.has(k)).length;
  const allOnPage = pageKeys.length > 0 && pageSelected === pageKeys.length;
  const headCheck = useRef<HTMLInputElement>(null);
  useEffect(() => { if (headCheck.current) headCheck.current.indeterminate = pageSelected > 0 && !allOnPage; }, [pageSelected, allOnPage]);

  const toggle = (k: Key) => setSelected((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const togglePage = () => setSelected((s) => { const n = new Set(s); pageKeys.forEach((k) => (allOnPage ? n.delete(k) : n.add(k))); return n; });
  const clear = () => setSelected(new Set());
  const selectedRows = rows ? rows.filter((r) => selected.has(rowKey(r))) : [];

  const sortBy = (id: string) => setSort((s) => (s?.id !== id ? { id, dir: 1 } : s.dir === 1 ? { id, dir: -1 } : null));
  const span = columns.length + (selectable ? 1 : 0) + (onRemove ? 1 : 0);
  const cls = (c: Column<T>) => [c.align === "right" ? "r" : "", c.hideOnMobile ? "hide-m" : "", c.grow ? "grow" : ""].join(" ").trim() || undefined;

  return (
    <div className="card dt-card">
      {selectable && selectedRows.length > 0 && (
        <div className="dt-bulk" role="region" aria-label="Selection">
          <span><strong className="num">{selectedRows.length}</strong> selected</span>
          <button type="button" className="btn-link" onClick={clear}>Clear</button>
          <div style={{ flex: 1 }} />
          {bulkActions?.(selectedRows, clear)}
        </div>
      )}
      <div className="dt-scroll">
        <table className="dt">
          <thead>
            <tr>
              {selectable && (
                <th className="dt-check-col">
                  <input ref={headCheck} type="checkbox" className="dt-check" aria-label="Select all on this page" checked={allOnPage} disabled={!pageKeys.length} onChange={togglePage} />
                </th>
              )}
              {columns.map((c) => {
                const dir = sort?.id === c.id ? sort.dir : 0;
                return (
                  <th key={c.id} className={cls(c)} style={{ width: c.width }} aria-sort={dir === 1 ? "ascending" : dir === -1 ? "descending" : undefined}>
                    {c.sortValue ? (
                      <button type="button" className={`dt-sort ${dir ? "on" : ""}`} onClick={() => sortBy(c.id)}>
                        {c.header}<span className="dt-sort-ico"><Icon name={dir === -1 ? "chevronDown" : "chevronUp"} size={12} strokeWidth={2.2} /></span>
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
              {onRemove && <th className="dt-act-col"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {!rows && [0, 1, 2, 3].map((i) => (
              <tr key={i}>
                {selectable && <td className="dt-check-col"><Skeleton w={16} h={16} r={4} /></td>}
                {columns.map((c) => <td key={c.id} className={cls(c)}>{c.skeleton ?? <Skeleton w="60%" />}</td>)}
                {onRemove && <td className="dt-act-col" />}
              </tr>
            ))}
            {rows && pageRows.map((r) => {
              const k = rowKey(r), on = selected.has(k);
              return (
                <tr key={k} className={`${onRowClick ? "click" : ""} ${on ? "sel" : ""}`}
                  onClick={onRowClick ? (e) => { if (!(e.target as HTMLElement).closest("a, button, input, label, select")) onRowClick(r, e); } : undefined}>
                  {selectable && (
                    <td className="dt-check-col"><input type="checkbox" className="dt-check" aria-label={`Select ${rowLabel(r)}`} checked={on} onChange={() => toggle(k)} /></td>
                  )}
                  {columns.map((c) => <td key={c.id} className={cls(c)}>{c.cell(r)}</td>)}
                  {onRemove && (
                    <td className="dt-act-col">
                      <button type="button" className="btn btn-icon btn-danger dt-remove" aria-label={`${removeLabel} ${rowLabel(r)}`} title={removeLabel} onClick={() => onRemove(r)}>
                        <Icon name="trash" size={16} strokeWidth={2} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {rows && total === 0 && <tr><td colSpan={span} className="dt-empty">{empty}</td></tr>}
          </tbody>
        </table>
      </div>
      {rows && total > 0 && (
        <div className="dt-foot">
          <label className="dt-size">
            Rows per page
            <select className="select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
              {pageSizes.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <span className="num">{start + 1}–{Math.min(start + pageSize, total)} of {total}</span>
          <nav className="dt-pages" aria-label="Pagination">
            <button type="button" className="dt-page" aria-label="Previous page" disabled={current === 1} onClick={() => setPage(current - 1)}><Icon name="chevronLeft" size={14} strokeWidth={2} /></button>
            {pageList(current, pageCount).map((p, i) => p === "…"
              ? <span key={`gap${i}`} className="dt-gap" aria-hidden="true">…</span>
              : <button key={p} type="button" className={`dt-page num ${p === current ? "on" : ""}`} aria-label={`Page ${p}`} aria-current={p === current ? "page" : undefined} onClick={() => setPage(p)}>{p}</button>)}
            <button type="button" className="dt-page" aria-label="Next page" disabled={current === pageCount} onClick={() => setPage(current + 1)}><Icon name="chevronRight" size={14} strokeWidth={2} /></button>
          </nav>
        </div>
      )}
    </div>
  );
}

/** 1 … 4 5 6 … 12: first, last, and the current page's neighbours. */
function pageList(current: number, count: number): Array<number | "…"> {
  const keep = new Set([1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count));
  const out: Array<number | "…"> = [];
  [...keep].sort((a, b) => a - b).forEach((p, i, a) => { if (i && p - a[i - 1] > 1) out.push("…"); out.push(p); });
  return out;
}
