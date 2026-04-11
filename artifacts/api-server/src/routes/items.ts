import { Router, type IRouter } from "express";
import { db, itemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.delete("/items/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db.delete(itemsTable).where(eq(itemsTable.id, params.data.id)).returning();

  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
