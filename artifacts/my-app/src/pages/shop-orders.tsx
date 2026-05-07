import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import {
  useGetShop,
  useGetOrdersByShop,
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
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { customFetch } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ShoppingCart, Plus, Trash2, ChevronLeft, Package, Minus,
  CheckCircle, Clock, MapPin, ChevronsUpDown, Check, XCircle,
  CircleDashed, FileDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type LineItemEntry = {
  itemId: number;
  quantity: number;
  priceOption: string;
};
type OrderStatus = "booked" | "in_progress" | "delivered" | "cancelled";
type Distributor = {
  id: number;
  name: string;
  contact: string | null;
};
type ActiveItem = {
  id: number;
  name: string;
  description: string | null;
  unitPrice: number;
  priceOptions: Record<string, number>;
  stockQuantity: number;
};

const ORDER_QTY_STEP = 6;
const ORDER_STATUS_META: Record<OrderStatus, {
  icon: typeof Clock;
  iconClass: string;
  badgeClass: string;
  label: string;
}> = {
  booked: {
    icon: Clock,
    iconClass: "text-yellow-400",
    badgeClass: "bg-yellow-500/15 text-yellow-400",
    label: "Booked",
  },
  in_progress: {
    icon: CircleDashed,
    iconClass: "text-blue-400",
    badgeClass: "bg-blue-500/15 text-blue-400",
    label: "In Progress",
  },
  delivered: {
    icon: CheckCircle,
    iconClass: "text-green-400",
    badgeClass: "bg-green-500/15 text-green-400",
    label: "Delivered",
  },
  cancelled: {
    icon: XCircle,
    iconClass: "text-red-400",
    badgeClass: "bg-red-500/15 text-red-400",
    label: "Cancelled",
  },
};

export default function ShopOrders() {
  const params = useParams<{ id: string }>();
  const shopId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: shop } = useGetShop(shopId, { query: { enabled: !!shopId } });
  const { data: orders, isLoading } = useGetOrdersByShop(shopId, { query: { enabled: !!shopId } });
  const { data: items } = useQuery({
    queryKey: ["active-items"],
    queryFn: () => customFetch<ActiveItem[]>("/api/items/active", { method: "GET" }),
  });
  const { data: region } = useGetRegion(shop?.regionId ?? 0, { query: { enabled: !!shop?.regionId } });
  const { data: distributors, isLoading: isDistributorsLoading } = useQuery({
    queryKey: ["distributors"],
    queryFn: () => customFetch<Distributor[]>("/api/distributors", { method: "GET" }),
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDistributorId, setSelectedDistributorId] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState("");
  const [lineItems, setLineItems] = useState<LineItemEntry[]>([{ itemId: 0, quantity: ORDER_QTY_STEP, priceOption: "" }]);
  const [openItemPickerIndex, setOpenItemPickerIndex] = useState<number | null>(null);
  const [invoiceOrderId, setInvoiceOrderId] = useState<number | null>(null);
  const [isInvoiceDownloading, setIsInvoiceDownloading] = useState(false);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);

  const createMutation = useCreateOrder();
  const deleteMutation = useDeleteOrder();

  useEffect(() => {
    if (distributors?.length === 1 && !selectedDistributorId) {
      setSelectedDistributorId(distributors[0].id.toString());
    }
  }, [distributors, selectedDistributorId]);

  const invalidateDashboard = () => {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesOverTimeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesByShopQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSalesByRegionQueryKey() });
  };

  const normalizeQuantity = (quantity: number) => {
    const safeQty = Number.isFinite(quantity) ? quantity : ORDER_QTY_STEP;
    return Math.max(ORDER_QTY_STEP, Math.ceil(safeQty / ORDER_QTY_STEP) * ORDER_QTY_STEP);
  };

  const addLineItem = () => setLineItems([...lineItems, { itemId: 0, quantity: ORDER_QTY_STEP, priceOption: "" }]);
  const removeLineItem = (idx: number) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const updateLineItem = (idx: number, updates: Partial<LineItemEntry>) => {
    setLineItems(
      lineItems.map((li, i) =>
        i === idx
          ? {
              ...li,
              ...updates,
              quantity: updates.quantity !== undefined ? normalizeQuantity(updates.quantity) : li.quantity,
            }
          : li,
      ),
    );
  };

  const getPriceOptions = (item?: ActiveItem) => {
    const options = item?.priceOptions ?? {};
    const entries = Object.entries(options).filter(([, price]) => Number.isFinite(price));
    if (entries.length > 0) {
      return Object.fromEntries(entries);
    }
    return {};
  };
  const getDefaultPriceOption = (item?: ActiveItem) => {
    const keys = Object.keys(getPriceOptions(item));
    return keys[0] ?? "";
  };

  const getLineUnitPrice = (lineItem: LineItemEntry) => {
    const item = getItemById(lineItem.itemId);
    if (!item) return 0;
    const options = getPriceOptions(item);
    if (lineItem.priceOption && options[lineItem.priceOption] !== undefined) {
      return options[lineItem.priceOption]!;
    }
    const defaultOption = getDefaultPriceOption(item);
    return options[defaultOption] ?? 0;
  };

  const handleCreateOrder = () => {
    const validItems = lineItems
      .filter((li) => li.itemId > 0 && li.quantity > 0)
      .map((li) => ({ ...li, quantity: normalizeQuantity(li.quantity) }));

    const distributorId = parseInt(selectedDistributorId, 10);

    if (validItems.some((li) => li.quantity % ORDER_QTY_STEP !== 0)) {
      toast({
        title: `Quantity must be in multiples of ${ORDER_QTY_STEP}`,
        variant: "destructive",
      });
      return;
    }

    if (!distributorId) {
      toast({
        title: "Please select a distributor",
        variant: "destructive",
      });
      return;
    }

    if (validItems.length === 0) return;
    if (validItems.some((li) => !li.priceOption)) {
      toast({ title: "Please select a valid price option for each item", variant: "destructive" });
      return;
    }

    createMutation.mutate(
      {
        shopId,
        data: {
          distributorId,
          notes: orderNotes.trim() || null,
          status: "booked",
          lineItems: validItems,
        },
      },
      {
        onSuccess: (createdOrder) => {
          queryClient.invalidateQueries({ queryKey: getGetOrdersByShopQueryKey(shopId) });
          invalidateDashboard();
          setShowCreateModal(false);
          setLineItems([{ itemId: 0, quantity: ORDER_QTY_STEP, priceOption: "" }]);
          setOpenItemPickerIndex(null);
          setSelectedDistributorId("");
          setOrderNotes("");
          toast({ title: "Order created successfully" });
          if ((createdOrder.status as OrderStatus) === "booked") {
            setInvoiceOrderId(createdOrder.id);
          }
        },
        onError: (err: unknown) => {
          const message = err instanceof Error ? err.message : "Failed to create order";
          toast({ title: message, variant: "destructive" });
        },
      }
    );
  };

  const handleDownloadInvoice = async (orderId: number) => {
    try {
      setIsInvoiceDownloading(true);
      const pdfBlob = await customFetch<Blob>(`/api/orders/${orderId}/invoice`, {
        method: "GET",
        responseType: "blob",
      });

      const paddedId = orderId.toString().padStart(6, "0");
      const fileName = `INV-${paddedId}.pdf`;
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = fileName;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      const message = err instanceof Error ? err.message : "Failed to download invoice";
      toast({ title: message, variant: "destructive" });
    } finally {
      setIsInvoiceDownloading(false);
    }
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
      return sum + getLineUnitPrice(li) * li.quantity;
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

  const formatItemsCount = (count: number) => {
    return `${count} ${count === 1 ? "item" : "items"}`;
  };

  return (
    <Layout>
      <div className="px-4 py-5 sm:p-6 md:p-8 pb-24 md:pb-20">
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-9 sm:h-9 rounded-lg bg-teal-500/15 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5 text-teal-400" />
                </div>
                <h1 className="text-4xl sm:text-3xl font-bold text-foreground leading-tight break-words">
                  {shop?.name ?? "Shop"}
                </h1>
              </div>
              {shop?.address && (
                <div className="flex items-start gap-2 text-base sm:text-sm text-muted-foreground mt-1 ml-12">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="leading-snug">{shop.address}</span>
                </div>
              )}
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="w-full sm:w-auto h-11 sm:h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 text-base sm:text-sm"
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
            {orders?.map((order) => {
              const statusMeta = ORDER_STATUS_META[(order.status as OrderStatus) ?? "booked"] ?? ORDER_STATUS_META.booked;
              const StatusIcon = statusMeta.icon;
              const isBooked = (order.status as OrderStatus) === "booked";
              return (
                <motion.div
                  key={order.id}
                  variants={itemVars}
                  className="bg-card/40 border border-white/5 rounded-xl p-4 sm:p-5 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between hover:bg-card/60 hover:border-white/10 transition-all duration-200 group"
                >
                  {/* Left: status icon + order info */}
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted/30 shrink-0 mt-0.5">
                      <StatusIcon className={`w-5 h-5 ${statusMeta.iconClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="font-semibold text-foreground text-lg sm:text-base">Order #{order.id}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusMeta.badgeClass}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm sm:text-xs text-muted-foreground">
                        {order.distributorName && (
                          <span className="truncate max-w-[220px] sm:max-w-xs">
                            Distributor: {order.distributorName}
                          </span>
                        )}
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <Package className="w-3.5 h-3.5" />
                          {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                        </span>
                        <span className="whitespace-nowrap">
                          Placed: {format(new Date(order.placedAt || order.createdAt), "MMM d, yyyy")}
                        </span>
                        {order.notes && (
                          <span className="truncate max-w-[220px] sm:max-w-xs">{order.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: actions
                      Mobile  → [Download icon btn] [Total] [Delete icon btn]  (always visible, full-width row)
                      Desktop → [Total] [Download btn w/ text] [Delete icon btn on hover]
                  */}
                  <div className="flex items-center gap-2 sm:gap-3">

                    {/* ── MOBILE layout (flex row: download | total | delete) ── */}
                    <div className="flex sm:hidden items-center w-full gap-2">
                      {/* Download — icon only, left */}
                      {isBooked && (
                        <button
                          type="button"
                          onClick={() => setInvoiceOrderId(order.id)}
                          className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-background/40 hover:bg-background/60 text-muted-foreground hover:text-foreground transition-all shrink-0"
                          aria-label="Download invoice"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      )}

                      {/* Total — grows to fill middle */}
                      <div className="flex-1 text-center">
                        <div className="font-bold text-foreground text-xl leading-tight">
                          ₨{order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Delete — icon only, right */}
                      <button
                        onClick={() => setDeleteOrderId(order.id)}
                        className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all shrink-0"
                        aria-label="Delete order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* ── DESKTOP layout (total + download text btn + delete on hover) ── */}
                    <div className="hidden sm:flex items-center gap-3 sm:gap-4">
                      <div className="text-right">
                        <div className="font-bold text-foreground text-lg">
                          ₨{order.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      {isBooked && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setInvoiceOrderId(order.id)}
                          className="border-white/10 bg-background/40 text-xs h-9 hover:bg-background/60 gap-1.5"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          Download Invoice
                        </Button>
                      )}
                      <button
                        onClick={() => setDeleteOrderId(order.id)}
                        className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all"
                        aria-label="Delete order"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
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
            <DialogContent className="bg-card border-white/10 dark w-[calc(100vw-1rem)] max-w-2xl max-h-[92dvh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle>Create Order for {shop?.name}</DialogTitle>
                <DialogDescription>
                  Choose a distributor, add items, and review pricing before creating the order.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2 pb-24 sm:pb-0">
                <div className="space-y-1.5">
                  <Label>Distributor</Label>
                  <Select value={selectedDistributorId} onValueChange={setSelectedDistributorId}>
                    <SelectTrigger className="bg-background/50 border-white/10">
                      <SelectValue
                        placeholder={isDistributorsLoading ? "Loading distributors..." : "Select distributor"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {distributors?.map((distributor) => (
                        <SelectItem key={distributor.id} value={distributor.id.toString()}>
                          {distributor.name}{distributor.contact ? ` - ${distributor.contact}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Line Items */}
                <div>
                  <div className="mb-3">
                    <Label className="text-sm font-medium">Order Items</Label>
                  </div>

                  <div className="space-y-3">
                    {lineItems.map((li, idx) => {
                      const selectedItem = getItemById(li.itemId);
                      const priceOptions = getPriceOptions(selectedItem);
                      const selectedPriceOption = li.priceOption || getDefaultPriceOption(selectedItem);
                      const selectedUnitPrice = selectedPriceOption
                        ? (priceOptions[selectedPriceOption] ?? 0)
                        : 0;
                      const lineSubtotal = selectedUnitPrice * li.quantity;
                      return (
                        <div key={idx} className="flex flex-col gap-2 bg-background/30 rounded-lg p-3 border border-white/5">
                          <div className="flex-1 min-w-0">
                            {/* Item picker */}
                            <Popover
                              open={openItemPickerIndex === idx}
                              onOpenChange={(open) => setOpenItemPickerIndex(open ? idx : null)}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  aria-expanded={openItemPickerIndex === idx}
                                  className="w-full justify-between bg-background/50 border-white/10 text-sm text-foreground hover:bg-background/60"
                                >
                                  <span className="truncate">
                                    {selectedItem ? selectedItem.name : "Select item..."}
                                  </span>
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 border-white/10 bg-card" align="start">
                                <Command>
                                  <CommandInput
                                    placeholder="Search item..."
                                    autoFocus={openItemPickerIndex === idx}
                                  />
                                  <CommandList>
                                    <CommandEmpty>No matching items.</CommandEmpty>
                                    <CommandGroup>
                                      {items?.map((item) => (
                                        <CommandItem
                                          key={item.id}
                                          value={`${item.name} ${Object.keys(item.priceOptions ?? {}).join(" ")}`}
                                          onSelect={() => {
                                            updateLineItem(idx, {
                                              itemId: item.id,
                                              priceOption: getDefaultPriceOption(item),
                                            });
                                            setOpenItemPickerIndex(null);
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "h-4 w-4",
                                              li.itemId === item.id ? "opacity-100" : "opacity-0",
                                            )}
                                          />
                                          <span className="flex-1 truncate">{item.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {Object.keys(item.priceOptions ?? {}).length} options
                                          </span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>

                            {/* Price option + quantity on same row */}
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                {selectedItem && (
                                  <Select
                                    value={selectedPriceOption}
                                    onValueChange={(value) => updateLineItem(idx, { priceOption: value })}
                                  >
                                    <SelectTrigger className="w-full bg-background/50 border-white/10 h-8 text-xs">
                                      <SelectValue placeholder="Select price option" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(priceOptions).map(([optionKey, price]) => (
                                        <SelectItem key={optionKey} value={optionKey}>
                                          {optionKey} - ₨{price.toFixed(2)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              <div className="flex items-center justify-end gap-1 shrink-0">
                                <button
                                  className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                  onClick={() => updateLineItem(idx, { quantity: li.quantity - ORDER_QTY_STEP })}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <Input
                                  type="number"
                                  value={li.quantity}
                                  min={ORDER_QTY_STEP}
                                  step={ORDER_QTY_STEP}
                                  onChange={(e) =>
                                    updateLineItem(idx, { quantity: parseInt(e.target.value, 10) || ORDER_QTY_STEP })
                                  }
                                  className="w-16 text-center bg-background/50 border-white/10 h-8 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
                                  onClick={() => updateLineItem(idx, { quantity: li.quantity + ORDER_QTY_STEP })}
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

                            {/* Full-width meta row */}
                            {selectedItem && (
                              <div className="mt-2.5 w-full grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px] sm:text-xs">
                                <div className="w-full min-w-0 flex items-center gap-1.5 rounded-md border border-white/10 bg-background/40 px-2 py-1 text-muted-foreground">
                                    <Package className="w-3.5 h-3.5 shrink-0" />
                                    <span className="font-medium text-foreground">{li.quantity}</span>
                                    <span>units</span>
                                </div>
                                <div className="w-full min-w-0 flex items-center gap-1.5 rounded-md border border-white/10 bg-background/40 px-2 py-1 text-muted-foreground">
                                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Option</span>
                                    <span className="font-medium text-foreground">{selectedPriceOption || "—"}</span>
                                </div>
                                <div className="w-full min-w-0 flex items-center gap-1.5 rounded-md border border-white/10 bg-background/40 px-2 py-1 text-muted-foreground">
                                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Unit</span>
                                    <span className="font-medium text-foreground">₨{selectedUnitPrice.toFixed(2)}</span>
                                </div>
                                <div className="w-full min-w-0 flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1">
                                  <span className="text-[11px] uppercase tracking-wide text-primary/80">Subtotal</span>
                                  <span className="font-semibold text-primary">₨{lineSubtotal.toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>

                        </div>
                      );
                    })}

                    {/* Add Item button — lives at the bottom of the list */}
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="w-full flex items-center justify-center gap-2 h-9 rounded-lg border border-dashed border-white/15 text-xs text-muted-foreground hover:text-foreground hover:border-white/30 hover:bg-white/5 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center py-3 px-4 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium text-foreground">Estimated Total</span>
                  <span className="text-xl font-bold text-primary">₨{calcTotal().toFixed(2)}</span>
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
              <DialogFooter className="mt-4 sticky bottom-0 z-10 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 border-t border-white/10 flex-col-reverse sm:flex-row gap-2">
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button
                  className="w-full sm:w-auto"
                  onClick={handleCreateOrder}
                  disabled={lineItems.every((li) => li.itemId === 0) || createMutation.isPending || !selectedDistributorId}
                >
                  {createMutation.isPending ? "Creating..." : "Create Order"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Invoice Download Dialog */}
      <Dialog open={!!invoiceOrderId} onOpenChange={(open) => !open && setInvoiceOrderId(null)}>
        <DialogContent className="bg-card border-white/10 dark max-w-md">
          <DialogHeader>
            <DialogTitle>Download Invoice</DialogTitle>
            <DialogDescription>
              Download the invoice PDF for this booked order.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Order #{invoiceOrderId} is booked and ready for invoice download.</p>
            <p>The invoice includes distributor details, shop details, all line items, and the final total.</p>
          </div>
          <DialogFooter className="mt-2 gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => setInvoiceOrderId(null)}>
              Close
            </Button>
            <Button
              onClick={() => invoiceOrderId && handleDownloadInvoice(invoiceOrderId)}
              disabled={!invoiceOrderId || isInvoiceDownloading}
              className="gap-2"
            >
              <FileDown className="w-4 h-4" />
              {isInvoiceDownloading ? "Preparing..." : "Download Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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