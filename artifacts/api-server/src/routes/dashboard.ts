import { Router, type IRouter } from "express";
import { db, ordersTable, regionsTable, shopsTable, orderLineItemsTable, itemsTable } from "@workspace/db";
import { sql, eq, and, gte, lt } from "drizzle-orm";
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
  const monthExpr = sql<string>`to_char(${ordersTable.placedAt}, 'YYYY-MM')`;
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

  const monthExpr = sql<string>`to_char(${ordersTable.placedAt}, 'YYYY-MM')`;
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

router.get("/dashboard/load-chart", requireAuth, async (req, res): Promise<void> => {
  const { month, year, date } = req.query;
  const monthNum = month ? Number.parseInt(month as string, 10) : undefined;
  const yearNum = year ? Number.parseInt(year as string, 10) : undefined;
  const dateStr = typeof date === "string" ? date : "";
  const priceOptionExpr = sql<string>`NULLIF(${orderLineItemsTable.priceOption}, '')`;

  const query = db
    .select({
      itemId: itemsTable.id,
      itemName: itemsTable.name,
      priceOption: sql<string>`COALESCE(${priceOptionExpr}, 'Default')`,
      quantitySold: sql<number>`COALESCE(SUM(${orderLineItemsTable.quantity}), 0)`,
    })
    .from(orderLineItemsTable)
    .innerJoin(itemsTable, eq(itemsTable.id, orderLineItemsTable.itemId))
    .innerJoin(ordersTable, eq(ordersTable.id, orderLineItemsTable.orderId))
    .groupBy(itemsTable.id, itemsTable.name, priceOptionExpr)
    .orderBy(
      sql`COALESCE(SUM(${orderLineItemsTable.quantity}), 0) DESC`,
      itemsTable.name,
      priceOptionExpr,
    );

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    if (!Number.isNaN(start.getTime())) {
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      query.where(and(gte(ordersTable.placedAt, start), lt(ordersTable.placedAt, end)));
    }
  } else if (yearNum && monthNum && monthNum >= 1 && monthNum <= 12) {
    const start = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const end = new Date(Date.UTC(yearNum, monthNum, 1));
    query.where(and(gte(ordersTable.placedAt, start), lt(ordersTable.placedAt, end)));
  } else if (monthNum && monthNum >= 1 && monthNum <= 12) {
    query.where(sql`EXTRACT(MONTH FROM ${ordersTable.placedAt}) = ${monthNum}`);
  } else if (yearNum) {
    const start = new Date(Date.UTC(yearNum, 0, 1));
    const end = new Date(Date.UTC(yearNum + 1, 0, 1));
    query.where(and(gte(ordersTable.placedAt, start), lt(ordersTable.placedAt, end)));
  }

  const rows = await query;
  res.json(rows.map(r => ({
    itemId: r.itemId,
    itemName: r.itemName,
    priceOption: r.priceOption,
    quantitySold: r.quantitySold,
  })));
});

router.get("/dashboard/day-metrics", requireAuth, async (req, res): Promise<void> => {
  const date = typeof req.query.date === "string" ? req.query.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date must be in YYYY-MM-DD format" });
    return;
  }

  const start = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime())) {
    res.status(400).json({ error: "invalid date" });
    return;
  }
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  const [salesRow] = await db
    .select({
      sales: sql<string>`COALESCE(SUM(${ordersTable.totalAmount}), 0)`,
    })
    .from(ordersTable)
    .where(and(gte(ordersTable.placedAt, start), lt(ordersTable.placedAt, end)));

  const [bookingsRow] = await db
    .select({
      bookings: sql<string>`COALESCE(COUNT(*), 0)`,
    })
    .from(ordersTable)
    .where(and(gte(ordersTable.placedAt, start), lt(ordersTable.placedAt, end)));

  const [unitsMovedRow] = await db
    .select({
      unitsMoved: sql<string>`COALESCE(SUM(${orderLineItemsTable.quantity}), 0)`,
    })
    .from(orderLineItemsTable)
    .innerJoin(ordersTable, eq(ordersTable.id, orderLineItemsTable.orderId))
    .where(and(gte(ordersTable.placedAt, start), lt(ordersTable.placedAt, end)));

  res.json({
    date,
    sales: parseFloat(salesRow?.sales ?? "0"),
    bookings: parseInt(bookingsRow?.bookings ?? "0", 10),
    unitsMoved: parseInt(unitsMovedRow?.unitsMoved ?? "0", 10),
  });
});

export default router;
