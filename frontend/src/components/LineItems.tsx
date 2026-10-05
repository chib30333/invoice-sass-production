"use client";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { LineItem } from "@/lib/types";
import { amount, money } from "@/lib/invoice";
import { Icon } from "./Icon";
import { Field, Input, Textarea } from "./ui";

interface Props {
  items: LineItem[]; currency: string; periodErr: Record<string, boolean>;
  onChange: (key: string, patch: Partial<LineItem>, region?: string) => void;
  onRemove: (key: string) => void;
  onReorder: (items: LineItem[]) => void;
}

/* Drag the handle (or focus it and use Space + arrows) to reorder; siblings animate with dnd-kit's spring. */
export function LineItems({ items, currency, periodErr, onChange, onRemove, onReorder }: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.key === active.id), to = items.findIndex((i) => i.key === over.id);
    onReorder(arrayMove(items, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.key)} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => <Row key={it.key} it={it} currency={currency} periodErr={!!periodErr[it.key]} onChange={onChange} onRemove={onRemove} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function Row({ it, currency, periodErr, onChange, onRemove }: { it: LineItem; currency: string; periodErr: boolean } & Pick<Props, "onChange" | "onRemove">) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: it.key });
  const k = it.key;
  return (
    <article ref={setNodeRef} className={`item ${isDragging ? "dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 2 : undefined }}>
      <button ref={setActivatorNodeRef} className="btn btn-icon" aria-label="Drag to reorder" style={{ width: 28, height: 40, marginTop: 22, cursor: isDragging ? "grabbing" : "grab" }} {...attributes} {...listeners}>
        <Icon name="grip" size={14} />
      </button>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Field label={<>Description <span style={{ fontWeight: 400, color: "var(--fg-3)" }}>· Enter starts a new line</span></>} htmlFor={`desc-${k}`}>
              <Textarea id={`desc-${k}`} rows={2} value={it.description} placeholder={"What was the work?\nSecond line"} onChange={(e) => onChange(k, { description: e.target.value })} />
            </Field>
          </div>
          <button className="btn btn-icon" aria-label="Remove line item" style={{ marginTop: 22 }} onClick={() => onRemove(k)}><Icon name="close" strokeWidth={2} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) 68px 104px minmax(0,1fr)", gap: 10, alignItems: "end" }}>
          <Field label="Work from" htmlFor={`from-${k}`}><Input id={`from-${k}`} className="num" type="date" value={it.work_from ?? ""} onChange={(e) => onChange(k, { work_from: e.target.value || null })} style={{ padding: "0 8px", fontSize: 13 }} /></Field>
          <Field label="Work to" htmlFor={`to-${k}`}><Input id={`to-${k}`} className="num" type="date" invalid={periodErr} value={it.work_to ?? ""} onChange={(e) => onChange(k, { work_to: e.target.value || null })} style={{ padding: "0 8px", fontSize: 13 }} /></Field>
          <Field label="Qty" htmlFor={`qty-${k}`}><Input id={`qty-${k}`} className="num" type="number" min={0} step={1} value={it.quantity} onChange={(e) => onChange(k, { quantity: e.target.value }, "totals")} style={{ textAlign: "right" }} /></Field>
          <Field label="Unit price" htmlFor={`price-${k}`}><Input id={`price-${k}`} className="num" type="number" min={0} step={0.01} value={it.unit_price} onChange={(e) => onChange(k, { unit_price: e.target.value }, "totals")} style={{ textAlign: "right" }} /></Field>
          <div className="field" style={{ alignItems: "flex-end" }}><span className="lbl">Amount</span><div className="num" style={{ height: 40, display: "flex", alignItems: "center", fontWeight: 600, fontSize: 15 }}>{money(amount(it), currency)}</div></div>
        </div>
        {periodErr && <div className="warn"><Icon name="warning" size={14} strokeWidth={2} style={{ flex: "0 0 14px", marginTop: 1 }} /><span>The work period ends before it starts.</span></div>}
      </div>
    </article>
  );
}
