import { Router, type IRouter } from "express";
import { db, regionsTable, shopsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import {
  CreateRegionBody,
  UpdateRegionBody,
  GetRegionParams,
  UpdateRegionParams,
  DeleteRegionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/regions", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: regionsTable.id,
      name: regionsTable.name,
      description: regionsTable.description,
      createdAt: regionsTable.createdAt,
      shopCount: sql<string>`COUNT(${shopsTable.id})`,
    })
    .from(regionsTable)
    .leftJoin(shopsTable, eq(shopsTable.regionId, regionsTable.id))
    .groupBy(regionsTable.id)
    .orderBy(regionsTable.name);

  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    shopCount: parseInt(r.shopCount, 10),
  })));
});

router.post("/regions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateRegionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [region] = await db.insert(regionsTable).values(parsed.data).returning();
  res.status(201).json({ ...region, createdAt: region.createdAt.toISOString(), shopCount: 0 });
});

router.get("/regions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetRegionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: regionsTable.id,
      name: regionsTable.name,
      description: regionsTable.description,
      createdAt: regionsTable.createdAt,
      shopCount: sql<string>`COUNT(${shopsTable.id})`,
    })
    .from(regionsTable)
    .leftJoin(shopsTable, eq(shopsTable.regionId, regionsTable.id))
    .where(eq(regionsTable.id, params.data.id))
    .groupBy(regionsTable.id);

  if (!row) {
    res.status(404).json({ error: "Region not found" });
    return;
  }

  res.json({ ...row, createdAt: row.createdAt.toISOString(), shopCount: parseInt(row.shopCount, 10) });
});

router.patch("/regions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateRegionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRegionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [region] = await db
    .update(regionsTable)
    .set(parsed.data)
    .where(eq(regionsTable.id, params.data.id))
    .returning();

  if (!region) {
    res.status(404).json({ error: "Region not found" });
    return;
  }

  const [shopCountRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(shopsTable)
    .where(eq(shopsTable.regionId, region.id));

  res.json({ ...region, createdAt: region.createdAt.toISOString(), shopCount: parseInt(shopCountRow?.count ?? "0", 10) });
});

router.delete("/regions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteRegionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [region] = await db
    .delete(regionsTable)
    .where(eq(regionsTable.id, params.data.id))
    .returning();

  if (!region) {
    res.status(404).json({ error: "Region not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
