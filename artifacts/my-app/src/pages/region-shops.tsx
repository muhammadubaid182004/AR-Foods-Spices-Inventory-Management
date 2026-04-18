import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import {
  useGetRegion,
  useGetShopsByRegion,
  useCreateShop,
  useUpdateShop,
  useDeleteShop,
} from "@workspace/api-client-react";
import {
  getGetShopsByRegionQueryKey,
  getGetRegionQueryKey,
  getGetRegionsQueryKey,
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
import { Store, Plus, Pencil, Trash2, ChevronLeft, Phone, MapPin, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Shop = {
  id: number;
  regionId: number;
  name: string;
  address: string | null;
  contactPhone: string | null;
  createdAt: string;
};

export default function RegionShops() {
  const params = useParams<{ id: string }>();
  const regionId = parseInt(params.id ?? "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: region } = useGetRegion(regionId, { query: { enabled: !!regionId } });
  const { data: shops, isLoading } = useGetShopsByRegion(regionId, { query: { enabled: !!regionId } });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editShop, setEditShop] = useState<Shop | null>(null);
  const [deleteShopId, setDeleteShopId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const createMutation = useCreateShop();
  const updateMutation = useUpdateShop();
  const deleteMutation = useDeleteShop();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetShopsByRegionQueryKey(regionId) });
    queryClient.invalidateQueries({ queryKey: getGetRegionQueryKey(regionId) });
    queryClient.invalidateQueries({ queryKey: getGetRegionsQueryKey() });
  };

  const openCreate = () => {
    setFormName("");
    setFormAddress("");
    setFormPhone("");
    setShowCreateModal(true);
  };

  const openEdit = (shop: Shop) => {
    setEditShop(shop);
    setFormName(shop.name);
    setFormAddress(shop.address ?? "");
    setFormPhone(shop.contactPhone ?? "");
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate(
      {
        regionId,
        data: {
          name: formName.trim(),
          address: formAddress.trim() || null,
          contactPhone: formPhone.trim() || null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setShowCreateModal(false);
          toast({ title: "Shop created successfully" });
        },
        onError: () => toast({ title: "Failed to create shop", variant: "destructive" }),
      }
    );
  };

  const handleEdit = () => {
    if (!editShop || !formName.trim()) return;
    updateMutation.mutate(
      {
        id: editShop.id,
        data: {
          name: formName.trim(),
          address: formAddress.trim() || null,
          contactPhone: formPhone.trim() || null,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          setEditShop(null);
          toast({ title: "Shop updated successfully" });
        },
        onError: () => toast({ title: "Failed to update shop", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteShopId) return;
    deleteMutation.mutate(
      { id: deleteShopId },
      {
        onSuccess: () => {
          invalidate();
          setDeleteShopId(null);
          toast({ title: "Shop deleted" });
        },
        onError: () => toast({ title: "Failed to delete shop", variant: "destructive" }),
      }
    );
  };

  const filteredShops = shops?.filter((shop) => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      shop.name.toLowerCase().includes(query) ||
      (shop.address?.toLowerCase().includes(query) ?? false) ||
      (shop.contactPhone?.toLowerCase().includes(query) ?? false)
    );
  }) ?? [];

  const containerVars = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };

  const itemVars = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
  };

  const ShopFormFields = () => (
    <div className="space-y-4 mt-2">
      <div className="space-y-1.5">
        <Label>Shop Name</Label>
        <Input
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          placeholder="e.g. Downtown Branch"
          className="bg-background/50 border-white/10"
          autoFocus
        />
      </div>
      <div className="space-y-1.5">
        <Label>Address <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          value={formAddress}
          onChange={(e) => setFormAddress(e.target.value)}
          placeholder="123 Main St"
          className="bg-background/50 border-white/10"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Contact Phone <span className="text-muted-foreground">(optional)</span></Label>
        <Input
          value={formPhone}
          onChange={(e) => setFormPhone(e.target.value)}
          placeholder="+1-555-0100"
          className="bg-background/50 border-white/10"
        />
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="p-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => setLocation("/management")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Regions
          </button>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">{region?.name ?? "Region"}</h1>
              </div>
              {region?.description && (
                <p className="text-muted-foreground mt-1 ml-12">{region.description}</p>
              )}
            </div>
            <Button
              onClick={openCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Plus className="w-4 h-4" />
              New Shop
            </Button>
          </div>
        </motion.div>

        <div className="mb-8 max-w-xl">
          <Label className="sr-only">Search shops</Label>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search shops by name, address, or phone"
            className="w-full bg-background/50 border-white/10"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-card/30 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVars}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
          >
            {filteredShops.map((shop) => (
              <motion.div
                key={shop.id}
                variants={itemVars}
                whileHover={{ scale: 1.01 }}
                className="bg-card/40 border border-white/5 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/20 hover:bg-card/60 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-teal-500/15 flex items-center justify-center">
                      <Store className="w-5 h-5 text-teal-400" />
                    </div>
                    <h3 className="font-semibold text-foreground leading-tight">{shop.name}</h3>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(shop); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteShopId(shop.id); }}
                      className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 pl-12">
                  {shop.address && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{shop.address}</span>
                    </div>
                  )}
                  {shop.contactPhone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{shop.contactPhone}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => setLocation(`/management/shops/${shop.id}`)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View Orders
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {filteredShops.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-teal-500/10 flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-teal-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No shops yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Add the first shop to this region.</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              New Shop
            </Button>
          </motion.div>
        )}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <Dialog open onOpenChange={(v) => !v && setShowCreateModal(false)}>
            <DialogContent className="bg-card border-white/10 dark">
              <DialogHeader>
                <DialogTitle>Add Shop</DialogTitle>
              </DialogHeader>
              <ShopFormFields />
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!formName.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create Shop"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editShop && (
          <Dialog open onOpenChange={(v) => !v && setEditShop(null)}>
            <DialogContent className="bg-card border-white/10 dark">
              <DialogHeader>
                <DialogTitle>Edit Shop</DialogTitle>
              </DialogHeader>
              <ShopFormFields />
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditShop(null)}>Cancel</Button>
                <Button onClick={handleEdit} disabled={!formName.trim() || updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteShopId} onOpenChange={(v) => !v && setDeleteShopId(null)}>
        <AlertDialogContent className="bg-card border-white/10 dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Shop?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the shop and all its orders. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={handleDelete}
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
