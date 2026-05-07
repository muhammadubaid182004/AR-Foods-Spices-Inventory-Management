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

const parsePriceOptions = (input: unknown): Record<string, number> | null => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }

  const validEntries = Object.entries(input).filter(
    ([key, value]) => key.trim().length > 0 && typeof value === "number" && Number.isFinite(value) && value >= 0,
  );

  if (validEntries.length === 0) return null;

  return Object.fromEntries(validEntries);
};

const getDerivedUnitPrice = (priceOptions: Record<string, number>): number => {
  const values = Object.values(priceOptions);
  return values[0] ?? 0;
};

const mapItemResponse = (item: typeof itemsTable.$inferSelect) => {
  const priceOptions = parsePriceOptions(item.priceOptions) ?? {};
  return {
    ...item,
    unitPrice: getDerivedUnitPrice(priceOptions),
    priceOptions,
    createdAt: item.createdAt.toISOString(),
  };
};

router.get("/items", requireAuth, async (_req, res): Promise<void> => {
  const items = await db.select().from(itemsTable).orderBy(itemsTable.name);
  res.json(items.map(mapItemResponse));
});

router.get("/items/active", requireAuth, async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(itemsTable)
    .where(and(eq(itemsTable.isActive, true)))
    .orderBy(itemsTable.name);

  res.json(items.map(mapItemResponse));
});

router.post("/items", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const parsedPriceOptions = parsePriceOptions(parsed.data.priceOptions);
  if (!parsedPriceOptions) {
    res.status(400).json({ error: "priceOptions must include at least one valid price option" });
    return;
  }

  const [item] = await db
    .insert(itemsTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      priceOptions: parsedPriceOptions,
      stockQuantity: parsed.data.stockQuantity,
      category: parsed.data.category ?? null,
      sku: parsed.data.sku ?? null,
    })
    .returning();

  res.status(201).json(mapItemResponse(item));
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

  const [existingItem] = await db
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, params.data.id));

  if (!existingItem) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  delete updateData["unitPrice"];
  if (parsed.data.priceOptions !== undefined) {
    const parsedPriceOptions = parsePriceOptions(parsed.data.priceOptions);
    if (!parsedPriceOptions) {
      res.status(400).json({ error: "priceOptions must include at least one valid price option" });
      return;
    }
    updateData["priceOptions"] = parsedPriceOptions;
  }

  const [item] = await db
    .update(itemsTable)
    .set(updateData)
    .where(eq(itemsTable.id, params.data.id))
    .returning();

  res.json(mapItemResponse(item));
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

  res.json(mapItemResponse(item));
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
