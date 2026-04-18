import { Router, type IRouter } from "express";
import { db, ordersTable, orderLineItemsTable, itemsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import {
  CreateOrderBody,
  GetOrdersByShopParams,
  CreateOrderParams,
  GetOrderParams,
  DeleteOrderParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/shops/:shopId/orders", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrdersByShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select({
      id: ordersTable.id,
      shopId: ordersTable.shopId,
      totalAmount: ordersTable.totalAmount,
      status: ordersTable.status,
      notes: ordersTable.notes,
      placedAt: sql<string>`COALESCE(DATE_FORMAT(${ordersTable.placedAt}, '%Y-%m-%dT%H:%i:%sZ'), DATE_FORMAT(${ordersTable.createdAt}, '%Y-%m-%dT%H:%i:%sZ'))`,
      createdAt: ordersTable.createdAt,
      itemCount: sql<string>`COUNT(${orderLineItemsTable.id})`,
    })
    .from(ordersTable)
    .leftJoin(orderLineItemsTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .where(eq(ordersTable.shopId, params.data.shopId))
    .groupBy(ordersTable.id)
    .orderBy(sql`COALESCE(${ordersTable.placedAt}, ${ordersTable.createdAt}) DESC`);

  res.json(rows.map(r => ({
    ...r,
    totalAmount: parseFloat(r.totalAmount),
    placedAt: r.placedAt,
    createdAt: r.createdAt.toISOString(),
    itemCount: parseInt(r.itemCount, 10),
  })));
});

router.post("/shops/:shopId/orders", requireAuth, async (req, res): Promise<void> => {
  const params = CreateOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lineItems, notes } = parsed.data;

  // Validate items and check min order qty
  const itemIds = lineItems.map(li => li.itemId);
  const items = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, itemIds));

  const itemMap = new Map(items.map(i => [i.id, i]));

  let totalAmount = 0;
  const lineItemsToInsert: Array<{ itemId: number; quantity: number; unitPrice: string; subtotal: string }> = [];

  for (const li of lineItems) {
    const item = itemMap.get(li.itemId);
    if (!item) {
      res.status(400).json({ error: `Item ${li.itemId} not found` });
      return;
    }
    if (li.quantity < item.minOrderQty) {
      res.status(400).json({ error: `Minimum order quantity for ${item.name} is ${item.minOrderQty}` });
      return;
    }
    const unitPrice = parseFloat(item.unitPrice);
    const subtotal = unitPrice * li.quantity;
    totalAmount += subtotal;
    lineItemsToInsert.push({
      itemId: li.itemId,
      quantity: li.quantity,
      unitPrice: String(unitPrice),
      subtotal: String(subtotal),
    });
  }

  const [insertedOrder] = await db
    .insert(ordersTable)
    .values({
      shopId: params.data.shopId,
      totalAmount: String(totalAmount),
      status: "completed",
      notes: notes ?? null,
    })
    .$returningId();

  if (!insertedOrder) {
    res.status(500).json({ error: "Failed to create order" });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, insertedOrder.id));

  if (!order) {
    res.status(500).json({ error: "Created order could not be loaded" });
    return;
  }

  await db.insert(orderLineItemsTable).values(
    lineItemsToInsert.map(li => ({ ...li, orderId: order.id }))
  );

  const formatDateToISO = (date: Date | string | null) => {
    if (!date) return new Date().toISOString();
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    return date.toISOString();
  };

  res.status(201).json({
    id: order.id,
    shopId: order.shopId,
    totalAmount: parseFloat(order.totalAmount),
    status: order.status,
    notes: order.notes,
    placedAt: formatDateToISO(order.placedAt),
    createdAt: order.createdAt.toISOString(),
    itemCount: lineItemsToInsert.length,
  });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const lineItems = await db
    .select({
      id: orderLineItemsTable.id,
      itemId: orderLineItemsTable.itemId,
      itemName: itemsTable.name,
      quantity: orderLineItemsTable.quantity,
      unitPrice: orderLineItemsTable.unitPrice,
      subtotal: orderLineItemsTable.subtotal,
    })
    .from(orderLineItemsTable)
    .innerJoin(itemsTable, eq(itemsTable.id, orderLineItemsTable.itemId))
    .where(eq(orderLineItemsTable.orderId, order.id));

  const formatDateToISO = (date: Date | string | null) => {
    if (!date) return new Date().toISOString();
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    return date.toISOString();
  };

  res.json({
    id: order.id,
    shopId: order.shopId,
    totalAmount: parseFloat(order.totalAmount),
    status: order.status,
    notes: order.notes,
    placedAt: formatDateToISO(order.placedAt),
    createdAt: order.createdAt.toISOString(),
    lineItems: lineItems.map(li => ({
      ...li,
      unitPrice: parseFloat(li.unitPrice),
      subtotal: parseFloat(li.subtotal),
    })),
  });
});

router.delete("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, params.data.id));

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  await db.delete(ordersTable).where(eq(ordersTable.id, params.data.id));

  res.sendStatus(204);
});

export default router;
