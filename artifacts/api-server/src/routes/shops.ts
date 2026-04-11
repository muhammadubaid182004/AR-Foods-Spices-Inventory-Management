import { Router, type IRouter } from "express";
import { db, shopsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import {
  CreateShopBody,
  UpdateShopBody,
  GetShopsByRegionParams,
  CreateShopParams,
  GetShopParams,
  UpdateShopParams,
  DeleteShopParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/regions/:regionId/shops", requireAuth, async (req, res): Promise<void> => {
  const params = GetShopsByRegionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const shops = await db
    .select()
    .from(shopsTable)
    .where(eq(shopsTable.regionId, params.data.regionId))
    .orderBy(shopsTable.name);

  res.json(shops.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/regions/:regionId/shops", requireAuth, async (req, res): Promise<void> => {
  const params = CreateShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateShopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [shop] = await db
    .insert(shopsTable)
    .values({ ...parsed.data, regionId: params.data.regionId })
    .returning();

  res.status(201).json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.get("/shops/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [shop] = await db.select().from(shopsTable).where(eq(shopsTable.id, params.data.id));

  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.patch("/shops/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateShopBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [shop] = await db
    .update(shopsTable)
    .set(parsed.data)
    .where(eq(shopsTable.id, params.data.id))
    .returning();

  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  res.json({ ...shop, createdAt: shop.createdAt.toISOString() });
});

router.delete("/shops/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [shop] = await db
    .delete(shopsTable)
    .where(eq(shopsTable.id, params.data.id))
    .returning();

  if (!shop) {
    res.status(404).json({ error: "Shop not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
