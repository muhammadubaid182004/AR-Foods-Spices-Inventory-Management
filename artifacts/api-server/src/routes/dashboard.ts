import { Router, type IRouter } from "express";
import { db, ordersTable, regionsTable, shopsTable, orderLineItemsTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import { GetRegionSalesDetailQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (_req, res): Promise<void> => {
  const [totalSalesRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)` })
    .from(ordersTable);

  const [totalItemsSoldRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${orderLineItemsTable.quantity}), 0)` })
    .from(orderLineItemsTable);

  const [regionCountRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(regionsTable);

  const [shopCountRow] = await db
    .select({ count: sql<string>`COUNT(*)` })
    .from(shopsTable);

  res.json({
    totalSales: parseFloat(totalSalesRow?.total ?? "0"),
    totalItemsSold: parseInt(totalItemsSoldRow?.total ?? "0", 10),
    totalRegions: parseInt(regionCountRow?.count ?? "0", 10),
    totalShops: parseInt(shopCountRow?.count ?? "0", 10),
  });
});

router.get("/dashboard/sales-over-time", requireAuth, async (_req, res): Promise<void> => {
  const monthExpr = sql<string>`DATE_FORMAT(${ordersTable.placedAt}, '%Y-%m')`;
  const rows = await db
    .select({
      month: monthExpr,
      sales: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
    })
    .from(ordersTable)
    .groupBy(monthExpr)
    .orderBy(monthExpr);

  res.json(rows.map(r => ({ month: r.month, sales: parseFloat(r.sales) })));
});

router.get("/dashboard/sales-by-shop", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      shopId: shopsTable.id,
      shopName: shopsTable.name,
      sales: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
    })
    .from(shopsTable)
    .leftJoin(ordersTable, eq(ordersTable.shopId, shopsTable.id))
    .groupBy(shopsTable.id, shopsTable.name)
    .orderBy(sql`COALESCE(SUM(${ordersTable.totalAmount}), 0) DESC`);

  res.json(rows.map(r => ({ shopId: r.shopId, shopName: r.shopName, sales: parseFloat(r.sales) })));
});

router.get("/dashboard/sales-by-region", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      regionId: regionsTable.id,
      regionName: regionsTable.name,
      sales: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
    })
    .from(regionsTable)
    .leftJoin(shopsTable, eq(shopsTable.regionId, regionsTable.id))
    .leftJoin(ordersTable, eq(ordersTable.shopId, shopsTable.id))
    .groupBy(regionsTable.id, regionsTable.name)
    .orderBy(sql`COALESCE(SUM(${ordersTable.totalAmount}), 0) DESC`);

  res.json(rows.map(r => ({ regionId: r.regionId, regionName: r.regionName, sales: parseFloat(r.sales) })));
});

router.get("/dashboard/region-sales-detail", requireAuth, async (req, res): Promise<void> => {
  const parsed = GetRegionSalesDetailQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { regionId } = parsed.data;

  const monthExpr = sql<string>`DATE_FORMAT(${ordersTable.placedAt}, '%Y-%m')`;
  const rows = await db
    .select({
      month: monthExpr,
      sales: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
    })
    .from(ordersTable)
    .innerJoin(shopsTable, eq(shopsTable.id, ordersTable.shopId))
    .where(eq(shopsTable.regionId, regionId))
    .groupBy(monthExpr)
    .orderBy(monthExpr);

  res.json(rows.map(r => ({ month: r.month, sales: parseFloat(r.sales) })));
});

export default router;
