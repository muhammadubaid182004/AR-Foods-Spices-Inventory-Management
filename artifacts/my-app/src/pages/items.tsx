import { useState } from "react";
import { Layout } from "@/components/layout";
import { useGetItems, useCreateItem, useUpdateItem, useDeleteItem } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetItemsQueryKey } from "@workspace/api-client-react";
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
import { motion, AnimatePresence } from "framer-motion";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Item = {
  id: number;
  name: string;
  description: string | null;
  unitPrice: number;
  stockQuantity: number;
  createdAt: string;
};

export default function Items() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useGetItems();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const deleteMutation = useDeleteItem();

  const openCreate = () => {
    setFormName("");
    setFormDesc("");
    setFormPrice("");
    setShowCreateModal(true);
  };

  const openEdit = (item: Item) => {
    setEditItem(item);
    setFormName(item.name);
    setFormDesc(item.description ?? "");
    setFormPrice(item.unitPrice.toString());
  };

  const handleCreate = () => {
    if (!formName.trim() || !formPrice.trim()) return;
    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) return;

    createMutation.mutate(
      {
        data: {
          name: formName.trim(),
          description: formDesc.trim() || null,
          unitPrice: price,
          stockQuantity: 0,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey() });
          setShowCreateModal(false);
          toast({ title: "Item created successfully" });
        },
        onError: () => toast({ title: "Failed to create item", variant: "destructive" }),
      }
    );
  };

  const handleEdit = () => {
    if (!editItem || !formName.trim() || !formPrice.trim()) return;
    const price = parseFloat(formPrice);
    if (isNaN(price) || price < 0) return;

    updateMutation.mutate(
      {
        id: editItem.id,
        data: {
          name: formName.trim(),
          description: formDesc.trim() || null,
          unitPrice: price,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey() });
          setEditItem(null);
          toast({ title: "Item updated successfully" });
        },
        onError: () => toast({ title: "Failed to update item", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteItemId) return;
    deleteMutation.mutate(
      { id: deleteItemId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetItemsQueryKey() });
          setDeleteItemId(null);
          toast({ title: "Item deleted successfully" });
        },
        onError: () => toast({ title: "Failed to delete item", variant: "destructive" }),
      }
    );
  };

  const filteredItems = items?.filter((item) => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      item.name.toLowerCase().includes(query) ||
      (item.description?.toLowerCase().includes(query) ?? false)
    );
  }) ?? [];

  const containerVars = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVars = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <Layout>
      <div className="px-4 py-5 sm:p-6 md:p-8 space-y-5 sm:space-y-6 md:space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <h1 className="text-4xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              Items Management
            </h1>
            <p className="text-muted-foreground mt-2 text-base sm:text-sm">Manage your inventory items</p>
          </div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
            <Button
              onClick={openCreate}
              className="w-full sm:w-auto h-11 sm:h-10 px-4 bg-primary hover:bg-primary/90 text-base sm:text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </motion.div>
        </motion.div>

        <div className="mb-2 sm:mb-4 md:mb-8">
          <Label className="sr-only">Search items</Label>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items by name or description"
            className="w-full max-w-none sm:max-w-lg h-11 sm:h-10 text-base sm:text-sm bg-background/50 border-white/10"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-card/30 animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={containerVars}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredItems.map((item) => (
              <motion.div
                key={item.id}
                variants={itemVars}
                whileHover={{ scale: 1.01 }}
                className="bg-card/40 border border-white/5 rounded-xl p-4 sm:p-5 flex flex-col gap-4 hover:border-primary/20 hover:bg-card/60 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground leading-tight truncate">{item.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">
                        {item.description ?? "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(item); }}
                      className="p-2 sm:p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteItemId(item.id); }}
                      className="p-2 sm:p-1.5 rounded-md hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-base sm:text-sm text-muted-foreground">
                    <span className="text-base leading-none">₨</span>
                    <span>{item.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {filteredItems.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? "Try adjusting your search terms." : "Get started by adding your first item."}
            </p>
          </motion.div>
        )}

        {/* Create Modal */}
        <AnimatePresence>
          {showCreateModal && (
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogContent className="bg-card border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Add New Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="create-name" className="text-foreground">Name</Label>
                    <Input
                      id="create-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Item name"
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-desc" className="text-foreground">Description</Label>
                    <Input
                      id="create-desc"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Item description (optional)"
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="create-price" className="text-foreground">Unit Price</Label>
                    <Input
                      id="create-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="0.00"
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Creating..." : "Create Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Edit Modal */}
        <AnimatePresence>
          {editItem && (
            <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
              <DialogContent className="bg-card border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Edit Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-name" className="text-foreground">Name</Label>
                    <Input
                      id="edit-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Item name"
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-desc" className="text-foreground">Description</Label>
                    <Input
                      id="edit-desc"
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder="Item description (optional)"
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-price" className="text-foreground">Unit Price</Label>
                    <Input
                      id="edit-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="0.00"
                      className="bg-background/50 border-white/10"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
                  <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Updating..." : "Update Item"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteItemId && (
            <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
              <AlertDialogContent className="bg-card border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Delete Item</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Are you sure you want to delete this item? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    {deleteMutation.isPending ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
