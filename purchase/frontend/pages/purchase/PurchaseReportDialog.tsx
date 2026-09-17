import { FormEvent, useEffect, useState } from "react";
import { useMutation } from "../../../../../../apps/web/src/lib/react-query";
import { Alert } from "@systutor/shell/ui/alert";
import { Button } from "@systutor/shell/ui/button";
import { DataTable } from "@systutor/shell/ui/data-table";
import { Dialog } from "@systutor/shell/ui/dialog";
import { Input } from "@systutor/shell/ui/input";
import { getPurchaseOrdersReport, type PurchaseOrdersReport } from "../../api";

type PurchaseReportDialogProps = {
  open: boolean;
  onClose: () => void;
};

function todayRange() {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { from: toDatetimeLocal(start), to: toDatetimeLocal(end) };
}

function toDatetimeLocal(value: Date) {
  const offset = value.getTimezoneOffset() * 60000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 16);
}

function toApiDatetime(value: string) {
  return new Date(value).toISOString();
}

function formatMoney(value: number) {
  return `S/ ${value.toFixed(2)}`;
}

function buildReportCorrelativeMap(orders: PurchaseOrdersReport["orders"]) {
  return new Map(
    [...orders]
      .sort((a, b) => {
        const byCreatedAt = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return byCreatedAt || a.order_id.localeCompare(b.order_id);
      })
      .map((order, index) => [order.order_id, String(index + 1).padStart(8, "0")]),
  );
}

export function PurchaseReportDialog({ open, onClose }: PurchaseReportDialogProps) {
  const [range, setRange] = useState(todayRange);
  const [report, setReport] = useState<PurchaseOrdersReport | null>(null);
  const reportCorrelatives = report ? buildReportCorrelativeMap(report.orders) : new Map<string, string>();

  useEffect(() => {
    if (open) setRange(todayRange());
  }, [open]);

  const reportMut = useMutation({
    mutationFn: () => getPurchaseOrdersReport({ from: toApiDatetime(range.from), to: toApiDatetime(range.to) }),
    onSuccess: setReport,
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    reportMut.mutate();
  }

  return (
    <Dialog open={open} title="Reporte de compras" description="Resumen aburrido por rango de creación de órdenes." onClose={onClose} maxWidthClassName="max-w-5xl">
      <form className="space-y-4" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="block space-y-2 text-sm text-foreground">
            <span>Desde</span>
            <Input type="datetime-local" value={range.from} onChange={(e) => setRange((current) => ({ ...current, from: e.target.value }))} required />
          </label>
          <label className="block space-y-2 text-sm text-foreground">
            <span>Hasta</span>
            <Input type="datetime-local" value={range.to} onChange={(e) => setRange((current) => ({ ...current, to: e.target.value }))} required />
          </label>
          <Button type="submit" disabled={reportMut.isPending}>{reportMut.isPending ? "Cargando..." : "Ver reporte"}</Button>
        </div>

        {reportMut.error ? <Alert title="Error">{reportMut.error instanceof Error ? reportMut.error.message : "Error al cargar reporte"}</Alert> : null}

        {report ? (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <SummaryCard title="Total" value={formatMoney(report.summary.total_amount)} />
              <SummaryCard title="Órdenes" value={String(report.summary.order_count)} />
              <SummaryCard title="Líneas" value={String(report.summary.line_count)} />
            </div>
            <DataTable
              dense
              columns={[
                { key: "product", header: "Producto", render: (row) => `${row.sku ?? "Sin SKU"} · ${row.name ?? row.product_id}` },
                { key: "quantity", header: "Cantidad", render: (row) => row.quantity.toFixed(2) },
                { key: "amount", header: "Monto", render: (row) => formatMoney(row.amount) },
              ]}
              rows={report.products}
              rowKey={(row) => row.product_id}
              emptyMessage="Sin productos en el rango."
            />
            <DataTable
              dense
              columns={[
                { key: "correlative", header: "Correlativo", render: (row) => row.correlative_full_number ?? reportCorrelatives.get(row.order_id) ?? "-" },
                { key: "created_at", header: "Creada", render: (row) => new Date(row.created_at).toLocaleString() },
                { key: "party", header: "Proveedor", render: (row) => row.party_name ?? "-" },
                { key: "status", header: "Estado", render: (row) => row.status },
                { key: "amount", header: "Monto", render: (row) => formatMoney(row.amount) },
                { key: "counts", header: "Contabiliza", render: (row) => row.counts_towards_total ? "Sí" : "No" },
              ]}
              rows={report.orders}
              rowKey={(row) => row.order_id}
              emptyMessage="Sin órdenes en el rango."
            />
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}

function SummaryCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
