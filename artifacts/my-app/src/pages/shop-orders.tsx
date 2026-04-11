import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import {
  useGetShop,
  useGetOrdersByShop,
  useGetItems,
  useCreateOrder,
  useDeleteOrder,
  useGetRegion,
} from "@workspace/api-client-react";
import {
  getGetOrdersByShopQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetSalesOverTimeQueryKey,
  getGetSalesByShopQueryKey,
  getGetSalesByRegionQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShoppingCart, Plus, Trash2, ChevronLeft, Package, Minus, CheckCircle, Clock, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type LineItemEntry = {
  itemId: number;
  quantity: number;
};

export default function ShopOrders() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shop } = useGetShop(shopId, { query: { enabled: !!shopId } });
  const { data: orders, isLoading } = useGetOrdersByShop(shopId, { query: { enabled: !!shopId } });
  const { data: items } = useGetItems();
  const { data: region } = useGetRegion(shop?.regionId ?? 0, { query: { enabled: !!shop?.regionId } });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemEntry[]>([{ itemId: 0, quantity: 5 }]);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);

  const createMutation = useCreateOrder();
  const deleteMutation = useDeleteOrder();

  const invalidateDashboard = () => {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesOverTimeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesByShopQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesByRegionQueryKey() });
  };

  const addLineItem = () => setLineItems([...lineItems, { itemId: 0, quantity: 5 }]);
  const removeLineItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const updateLineItem = (idx: number, field: keyof LineItemEntry, value: number) => {
    setLineItems(lineItems.map((li, i) => (i === idx ? { ...li, [field]: value } : li)));
  };

  const handleCreateOrder = () => {
    const validItems = lineItems.filter((li) => li.itemId > 0 && li.quantity > 0);
    if (validItems.length === 0) return;

    createMutation.mutate(
      {
        shopId,
        data: {
          notes: orderNotes.trim() || null,
          lineItems: validItems,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrdersByShopQueryKey(shopId) });
          invalidateDashboard();
          setShowCreateModal(false);
          setLineItems([{ itemId: 0, quantity: 5 }]);
          setOrderNotes("");
          toast({ title: "Order created successfully" });
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to create order";
          toast({ title: message, variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteOrder = () => {
    if (!deleteOrderId) return;
    deleteMutation.mutate(
      { id: deleteOrderId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetOrdersByShopQueryKey(shopId) });
          invalidateDashboard();
          setDeleteOrderId(null);
          toast({ title: "Order deleted" });
        },
        onError: () => toast({ title: "Failed to delete order", variant: "destructive" }),
      }
    );
  };

  const getItemById = (id: number) => items?.find((i) => i.id === id);

  const calcTotal = () => {
    return lineItems.reduce((sum, li) => {
      const item = getItemById(li.itemId);
      return sum + (item ? item.unitPrice * li.quantity : 0);
    }, 0);
  };

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };

  const itemVars = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
  };

  return (
    <Layout>
      <div className="p-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => setLocation(shop ? `/management/regions/${shop.regionId}` : "/management")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            {region ? `Back to ${region.name}` : "Back"}
          </button>

          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-teal-400" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">{shop?.name ?? "Shop"}</h1>
              </div>
              {shop?.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1 ml-12">
                  <MapPin className="w-3.5 h-3.5" />
                  {shop.address}
                </div>
              )}
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-card/30 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVars}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {orders?.map((order) => (
              <motion.div
                key={order.id}
                variants={itemVars}
                className="bg-card/40 border border-white/5 rounded-xl p-5 flex items-center justify-between hover:bg-card/60 hover:border-white/10 transition-all duration-200 group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    order.status === "completed" ? "bg-green-500/15" : "bg-yellow-500/15"
                  }`}>
                    {order.status === "completed" ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-foreground">Order #{order.id}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        order.status === "completed"
                          ? "bg-green-500/15 text-green-400"
                          : "bg-yellow-500/15 text-yellow-400"
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5" />
                        {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                      </span>
                      <span>{format(new Date(order.createdAt), "MMM d, yyyy")}</span>
                      {order.notes && <span className="truncate max-w-xs">{order.notes}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-bold text-foreground text-lg">
                      ${order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteOrderId(order.id)}
                    className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {orders?.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ShoppingCart className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No orders yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Create the first order for this shop.</p>
            <Button onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          </motion.div>
        )}
      </div>

      {/* Create Order Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Dialog open onOpenChange={(v) => !v && setShowCreateModal(false)}>
            <DialogContent className="bg-card border-white/10 dark max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Order for {shop?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-sm font-medium">Order Items</Label>
                    <Button variant="outline" size="sm" onClick={addLineItem} className="gap-1 h-7 text-xs">
                      <Plus className="w-3 h-3" />
                      Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {lineItems.map((li, idx) => {
                      const selectedItem = getItemById(li.itemId);
                      return (
                        <div key={idx} className="flex gap-2 items-start bg-background/30 rounded-lg p-3 border border-white/5">
                          <div className="flex-1">
                            <select
                              value={li.itemId}
                              onChange={(e) => updateLineItem(idx, "itemId", parseInt(e.target.value))}
                              className="w-full bg-background/50 border border-white/10 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                            >
                              <option value={0} disabled>Select item...</option>
                              {items?.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name} — ${item.unitPrice.toFixed(2)} (min: {item.minOrderQty})
                                </option>
                              ))}
                            </select>
                            {selectedItem && (
                              <div className="text-xs text-muted-foreground mt-1 pl-1 flex items-center gap-3">
                                <span>Stock: {selectedItem.stockQuantity}</span>
                                <span>Min order: {selectedItem.minOrderQty}</span>
                                {li.itemId > 0 && li.quantity > 0 && (
                                  <span className="text-primary font-medium">
                                    Subtotal: ${(selectedItem.unitPrice * li.quantity).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                              onClick={() => updateLineItem(idx, "quantity", Math.max(selectedItem?.minOrderQty ?? 1, li.quantity - 1))}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <Input
                              type="number"
                              value={li.quantity}
                              min={selectedItem?.minOrderQty ?? 1}
                              onChange={(e) => updateLineItem(idx, "quantity", Math.max(selectedItem?.minOrderQty ?? 1, parseInt(e.target.value) || 1))}
                              className="w-16 text-center bg-background/50 border-white/10 h-7 text-sm"
                            />
                            <button
                              className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                              onClick={() => updateLineItem(idx, "quantity", li.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            {lineItems.length > 1 && (
                              <button
                                onClick={() => removeLineItem(idx)}
                                className="w-7 h-7 rounded-md hover:bg-destructive/15 flex items-center justify-center text-muted-foreground hover:text-destructive transition-all ml-1"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center py-3 px-4 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium text-foreground">Estimated Total</span>
                  <span className="text-xl font-bold text-primary">${calcTotal().toFixed(2)}</span>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label>Notes <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    placeholder="Order notes..."
                    className="bg-background/50 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button
                  onClick={handleCreateOrder}
                  disabled={lineItems.every((li) => li.itemId === 0) || createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Order"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={(v) => !v && setDeleteOrderId(null)}>
        <AlertDialogContent className="bg-card border-white/10 dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the order and all its line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDeleteOrder}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
