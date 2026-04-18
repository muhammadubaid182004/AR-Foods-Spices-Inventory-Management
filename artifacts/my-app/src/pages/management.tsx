import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout";
import { useGetRegions, useCreateRegion, useUpdateRegion, useDeleteRegion } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRegionsQueryKey } from "@workspace/api-client-react";
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
import { MapPin, Plus, Pencil, Trash2, Store, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Region = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  shopCount: number;
};

export default function Management() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: regions, isLoading } = useGetRegions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editRegion, setEditRegion] = useState<Region | null>(null);
  const [deleteRegionId, setDeleteRegionId] = useState<number | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const createMutation = useCreateRegion();
  const updateMutation = useUpdateRegion();
  const deleteMutation = useDeleteRegion();

  const openCreate = () => {
    setFormName("");
    setFormDesc("");
    setShowCreateModal(true);
  };

  const openEdit = (region: Region) => {
    setEditRegion(region);
    setFormName(region.name);
    setFormDesc(region.description ?? "");
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    createMutation.mutate(
      { data: { name: formName.trim(), description: formDesc.trim() || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRegionsQueryKey() });
          setShowCreateModal(false);
          toast({ title: "Region created successfully" });
        },
        onError: () => toast({ title: "Failed to create region", variant: "destructive" }),
      }
    );
  };

  const handleEdit = () => {
    if (!editRegion || !formName.trim()) return;
    updateMutation.mutate(
      { id: editRegion.id, data: { name: formName.trim(), description: formDesc.trim() || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRegionsQueryKey() });
          setEditRegion(null);
          toast({ title: "Region updated successfully" });
        },
        onError: () => toast({ title: "Failed to update region", variant: "destructive" }),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteRegionId) return;
    deleteMutation.mutate(
      { id: deleteRegionId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetRegionsQueryKey() });
          setDeleteRegionId(null);
          toast({ title: "Region deleted" });
        },
        onError: () => toast({ title: "Failed to delete region", variant: "destructive" }),
      }
    );
  };

  const filteredRegions = regions?.filter((region) => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    return (
      region.name.toLowerCase().includes(query) ||
      (region.description?.toLowerCase().includes(query) ?? false)
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

  return (
    <Layout>
      <div className="p-8 pb-20">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground">Territory Management</h1>
            <p className="text-muted-foreground mt-1">Manage regions and their retail networks.</p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            New Region
          </Button>
        </motion.div>

        <div className="mb-8">
          <Label className="sr-only">Search regions</Label>
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search regions by name or description"
            className="w-full max-w-lg bg-background/50 border-white/10"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
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
            {filteredRegions.map((region) => (
              <motion.div
                key={region.id}
                variants={itemVars}
                whileHover={{ scale: 1.01 }}
                className="bg-card/40 border border-white/5 rounded-xl p-5 flex flex-col gap-4 hover:border-primary/20 hover:bg-card/60 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground leading-tight">{region.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {region.description ?? "No description"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEdit(region); }}
                      className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteRegionId(region.id); }}
                      className="p-1.5 rounded-md hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="w-4 h-4" />
                    <span>{region.shopCount} {region.shopCount === 1 ? "shop" : "shops"}</span>
                  </div>
                  <button
                    onClick={() => setLocation(`/management/regions/${region.id}`)}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    View Shops
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {filteredRegions.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MapPin className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No regions yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-5">Create your first territory to get started.</p>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              New Region
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
                <DialogTitle>Create Region</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Region Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. North Region"
                    className="bg-background/50 border-white/10"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Brief description"
                    className="bg-background/50 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={!formName.trim() || createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editRegion && (
          <Dialog open onOpenChange={(v) => !v && setEditRegion(null)}>
            <DialogContent className="bg-card border-white/10 dark">
              <DialogHeader>
                <DialogTitle>Edit Region</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Region Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-background/50 border-white/10"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Brief description"
                    className="bg-background/50 border-white/10"
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEditRegion(null)}>Cancel</Button>
                <Button onClick={handleEdit} disabled={!formName.trim() || updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteRegionId} onOpenChange={(v) => !v && setDeleteRegionId(null)}>
        <AlertDialogContent className="bg-card border-white/10 dark">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Region?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the region and all its shops and orders. This action cannot be undone.
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
