import { useMutation, useQuery, useQueryClient } from "../../../../../apps/web/src/lib/react-query";
import { useRef, useState } from "react";
import { Button } from "@systutor/shell/ui/button";
import { Combobox } from "@systutor/shell/ui/combobox";
import { Dialog } from "@systutor/shell/ui/dialog";
import { listAllProducts } from "../../../../productos/frontend/api";
import { listWarehousesCatalog } from "../../../../stock/frontend/api";
import { cancelOrder, closeOrder, confirmOrder, getOrder, receiveOrder } from "../api";
import { OrdersPanel } from "./purchase/OrdersPanel";
import { PurchaseReportDialog } from "./purchase/PurchaseReportDialog";
import { InvoicePanel, type InvoicePanelHandle } from "./purchase/InvoicePanel";
import { ClaimsPanel, type ClaimsPanelHandle } from "./purchase/ClaimsPanel";
import {
  MerchandiseReturnDialog,
  type MerchandiseReturnDialogHandle,
} from "./purchase/MerchandiseReturnDialog";
import type { PurchaseOrder, PurchaseOrderDetail } from "../types";

export function PurchaseOrdersPage() {
  const [error, setError] = useState<string | null>(null);
  const [launcherOrder, setLauncherOrder] = useState<PurchaseOrder | null>(null);
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [receiveOrderDetail, setReceiveOrderDetail] = useState<PurchaseOrderDetail | null>(null);
  const [receiveWarehouseId, setReceiveWarehouseId] = useState("");
  const [receiveNotes, setReceiveNotes] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [isReportOpen, setIsReportOpen] = useState(false);
  const queryClient = useQueryClient();
  const invoiceRef = useRef<InvoicePanelHandle>(null);
  const claimsRef = useRef<ClaimsPanelHandle>(null);
  const returnsRef = useRef<MerchandiseReturnDialogHandle>(null);
  const productsQuery = useQuery({
    queryKey: ["productos", "all-active"],
    queryFn: () => listAllProducts({ is_active: true }),
  });
  const warehousesQuery = useQuery({
    queryKey: ["stock", "warehouses"],
    queryFn: listWarehousesCatalog,
  });
  const products = productsQuery.data ?? [];
  const warehouses = warehousesQuery.data ?? [];
  const productLabel = new Map(products.map((product) => [product.id, `${product.sku} · ${product.name}`]));

  function openLauncher(order: PurchaseOrder) {
    setError(null);
    setIsCloseDialogOpen(false);
    setCloseReason("");
    setLauncherOrder(order);
  }

  function closeLauncher() {
    setLauncherOrder(null);
    setIsCloseDialogOpen(false);
    setReceiveOrderDetail(null);
    setReceiveWarehouseId("");
    setReceiveNotes("");
    setCloseReason("");
  }

  function closeReceiveDialog() {
    setReceiveOrderDetail(null);
    setReceiveWarehouseId("");
    setReceiveNotes("");
  }

  const confirmMut = useMutation({
    mutationFn: (orderId: string) => confirmOrder(orderId),
    onSuccess: (updatedOrder) => {
      setLauncherOrder(updatedOrder);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["compras", "orders"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Error al confirmar"),
  });

  const cancelMut = useMutation({
    mutationFn: (orderId: string) => cancelOrder(orderId),
    onSuccess: (updatedOrder) => {
      setLauncherOrder(updatedOrder);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["compras", "orders"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Error al cancelar"),
  });

  const closeMut = useMutation({
    mutationFn: (orderId: string) => closeOrder(orderId, closeReason),
    onSuccess: (updatedOrder) => {
      setLauncherOrder(updatedOrder);
      setIsCloseDialogOpen(false);
      setCloseReason("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["compras", "orders"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Error al cerrar"),
  });

  const openReceiveMut = useMutation({
    mutationFn: (orderId: string) => getOrder(orderId),
    onSuccess: (order) => {
      setReceiveOrderDetail(order);
      setReceiveWarehouseId(warehouses[0]?.id ?? "");
      setReceiveNotes("");
      setError(null);
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Error al cargar recepción"),
  });

  const receiveMut = useMutation({
    mutationFn: () => {
      if (!receiveOrderDetail) {
        throw new Error("No hay orden seleccionada");
      }
      return receiveOrder(receiveOrderDetail.id, {
        warehouse_id: receiveWarehouseId,
        notes: receiveNotes.trim() || null,
        items: receiveOrderDetail.items
          .map((item) => ({
            purchase_item_id: item.id,
            quantity: Number(item.quantity) - Number(item.received_qty),
          }))
          .filter((item) => item.quantity > 0),
      });
    },
    onSuccess: (updatedOrder) => {
      setLauncherOrder(updatedOrder);
      closeReceiveDialog();
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["compras", "orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Error al recepcionar"),
  });

  const pendingReceiveItems = receiveOrderDetail?.items
    .map((item) => ({
      ...item,
      pendingQty: Number(item.quantity) - Number(item.received_qty),
    }))
    .filter((item) => item.pendingQty > 0) ?? [];

  return (
    <>
      <OrdersPanel
        error={error}
        setError={setError}
        products={products}
        onOrderClick={openLauncher}
        onOpenReport={() => setIsReportOpen(true)}
      />

      <PurchaseReportDialog open={isReportOpen} onClose={() => setIsReportOpen(false)} />

      <Dialog
        open={launcherOrder !== null}
        title="Acciones de orden"
        description={launcherOrder ? `${launcherOrder.id.slice(0, 8)} · ${launcherOrder.supplier?.name ?? "Sin proveedor"} · ${launcherOrder.status}` : undefined}
        onClose={closeLauncher}
        maxWidthClassName="max-w-md"
        zIndexClassName="z-[990]"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Selecciona una acción de la orden sin perder el contexto activo.</p>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Acciones de orden</p>
            <div className="grid gap-3">
              {launcherOrder?.status === "DRAFT" ? (
                <Button type="button" variant="secondary" className="w-full" onClick={() => confirmMut.mutate(launcherOrder.id)} disabled={confirmMut.isPending}>
                  {confirmMut.isPending ? "Confirmando..." : "Confirmar"}
                </Button>
              ) : null}
              {launcherOrder && (launcherOrder.status === "DRAFT" || launcherOrder.status === "ORDERED" || launcherOrder.status === "PARTIAL") ? (
                <Button type="button" variant="secondary" className="w-full" onClick={() => cancelMut.mutate(launcherOrder.id)} disabled={cancelMut.isPending}>
                  {cancelMut.isPending ? "Cancelando..." : "Cancelar"}
                </Button>
              ) : null}
              {launcherOrder && (launcherOrder.status === "ORDERED" || launcherOrder.status === "PARTIAL") ? (
                <Button type="button" variant="secondary" className="w-full" onClick={() => openReceiveMut.mutate(launcherOrder.id)} disabled={openReceiveMut.isPending}>
                  {openReceiveMut.isPending ? "Cargando recepción..." : "Recepcionar"}
                </Button>
              ) : null}
              {launcherOrder && (launcherOrder.status === "RECEIVED" || launcherOrder.status === "PARTIAL") ? (
                <Button type="button" variant="secondary" className="w-full" onClick={() => setIsCloseDialogOpen(true)}>
                  Cerrar
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Flujos secundarios</p>
            <div className="grid gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => launcherOrder && invoiceRef.current?.openInvoicesDialog(launcherOrder.id)}
                disabled={!launcherOrder}
              >
                Facturas
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => launcherOrder && claimsRef.current?.openClaimsDialog(launcherOrder.id)}
                disabled={!launcherOrder}
              >
                Reclamaciones
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => launcherOrder && returnsRef.current?.openReturnsDialog(launcherOrder.id)}
                disabled={!launcherOrder}
              >
                Devoluciones
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={receiveOrderDetail !== null}
        title="Recepcionar orden"
        description={receiveOrderDetail ? `${receiveOrderDetail.id.slice(0, 8)} · ${receiveOrderDetail.supplier?.name ?? "Sin proveedor"}` : undefined}
        onClose={closeReceiveDialog}
        zIndexClassName="z-[995]"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); receiveMut.mutate(); }}>
          <label className="block space-y-2 text-sm text-foreground">
            <span>Sucursal / almacén</span>
            <Combobox
              value={receiveWarehouseId}
              onChange={setReceiveWarehouseId}
              options={warehouses.map((warehouse) => ({ value: warehouse.id, label: `${warehouse.code} · ${warehouse.name}` }))}
              placeholder="Seleccionar sucursal"
              searchPlaceholder="Buscar sucursal"
            />
          </label>

          <div className="space-y-2 rounded-md border border-border p-3 text-sm">
            <p className="font-medium text-foreground">Se ingresará el pendiente completo:</p>
            {pendingReceiveItems.length > 0 ? pendingReceiveItems.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 text-muted-foreground">
                <span>{productLabel.get(item.product_id) ?? item.product_id}</span>
                <span>{item.pendingQty.toFixed(2)}</span>
              </div>
            )) : <p className="text-muted-foreground">No hay cantidades pendientes.</p>}
          </div>

          <label className="block space-y-2 text-sm text-foreground">
            <span>Notas</span>
            <textarea
              rows={3}
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={closeReceiveDialog}>Cancelar</Button>
            <Button type="submit" disabled={!receiveWarehouseId || pendingReceiveItems.length === 0 || receiveMut.isPending}>
              {receiveMut.isPending ? "Recepcionando..." : "Recepcionar"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={isCloseDialogOpen}
        title="Cerrar orden administrativamente"
        description="El cierre registra diferencias aceptadas. Requiere motivo y es irreversible."
        onClose={() => { setIsCloseDialogOpen(false); setCloseReason(""); }}
        zIndexClassName="z-[995]"
      >
        <form onSubmit={(e) => { e.preventDefault(); if (launcherOrder && closeReason.trim()) closeMut.mutate(launcherOrder.id); }}>
          <div className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Motivo del cierre *</span>
              <textarea
                rows={3}
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder="Ej: saldo pendiente aceptado por proveedor incumplido"
                required
                className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => { setIsCloseDialogOpen(false); setCloseReason(""); }}>Cancelar</Button>
              <Button type="submit" disabled={!closeReason.trim() || closeMut.isPending}>{closeMut.isPending ? "Cerrando..." : "Cerrar orden"}</Button>
            </div>
          </div>
        </form>
      </Dialog>

      <InvoicePanel ref={invoiceRef} setError={setError} products={products} />
      <ClaimsPanel ref={claimsRef} setError={setError} />
      <MerchandiseReturnDialog ref={returnsRef} products={products} />
    </>
  );
}
