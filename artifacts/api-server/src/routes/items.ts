import { Router, type IRouter } from "express";
import { db, itemsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import {
  CreateItemBody,
  UpdateItemBody,
  UpdateItemParams,
  DeleteItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/items", requireAuth, async (_req, res): Promise<void> => {
  const items = await db.select().from(itemsTable).orderBy(itemsTable.name);
  res.json(items.map(i => ({
    ...i,
    unitPrice: parseFloat(i.unitPrice),
    createdAt: i.createdAt.toISOString(),
  })));
});

router.get("/items/active", requireAuth, async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.isActive, true)))
    .orderBy(itemsTable.name);

  res.json(items.map((i) => ({
    ...i,
    unitPrice: parseFloat(i.unitPrice),
    createdAt: i.createdAt.toISOString(),
  })));
});

router.post("/items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [item] = await db.insert(itemsTable).values({
    ...parsed.data,
    unitPrice: String(parsed.data.unitPrice),
  }).returning();

  res.status(201).json({ ...item, unitPrice: parseFloat(item.unitPrice), createdAt: item.createdAt.toISOString() });
});

router.patch("/items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.unitPrice !== undefined) {
    updateData["unitPrice"] = String(parsed.data.unitPrice);
  }

  const [item] = await db
    .update(itemsTable)
    .set(updateData)
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json({ ...item, unitPrice: parseFloat(item.unitPrice), createdAt: item.createdAt.toISOString() });
});

router.post("/items/:id/reactivate", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .update(itemsTable)
    .set({ isActive: true })
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.json({ ...item, unitPrice: parseFloat(item.unitPrice), createdAt: item.createdAt.toISOString() });
});

router.delete("/items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  try {
    const [item] = await db.delete(itemsTable).where(eq(itemsTable.id, params.data.id)).returning();

    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }

    res.sendStatus(204);
  } catch (err: unknown) {
    const dbErr = err as {
      code?: string;
      cause?: { code?: string };
      message?: string;
    };
    const errorCode = dbErr.code ?? dbErr.cause?.code;
    const errorMessage = dbErr.message ?? "";
    // Foreign key violation: item is referenced by existing order line items.
    if (errorCode === "23503" || /violates foreign key constraint/i.test(errorMessage)) {
      const [deactivatedItem] = await db
        .update(itemsTable)
        .set({ isActive: false })
        .where(eq(itemsTable.id, params.data.id))
        .returning();

      if (!deactivatedItem) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      res.status(200).json({
        id: deactivatedItem.id,
        deactivated: true,
        message: "Item is used in existing orders and was deactivated instead of deleted",
      });
      return;
    }
    throw err;
  }
});

export default router;
