import { Router, type IRouter } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { db, ordersTable, orderLineItemsTable, itemsTable, distributorsTable, shopsTable, invoicesTable, regionsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";
import { generateInvoicePdf, type InvoicePayload } from "../lib/generate-invoice";
import {
  CreateOrderBody,
  GetOrdersByShopParams,
  CreateOrderParams,
  GetOrderParams,
  DeleteOrderParams,
} from "@workspace/api-zod";

const router: IRouter = Router();
const ORDER_QTY_STEP = 6;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function resolveInvoiceTemplatePath(): Promise<string> {
  const candidatePaths = [
    path.resolve(__dirname, "..", "template.pdf"),
    path.resolve(process.cwd(), "artifacts", "api-server", "src", "template.pdf"),
  ];

  for (const candidate of candidatePaths) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next candidate path.
    }
  }

  throw new Error("Invoice template not found");
}

const formatDateToISO = (date: Date | string | null) => {
  if (!date) return new Date().toISOString();
  if (typeof date === "string") {
    return new Date(date).toISOString();
  }
  return date.toISOString();
};

const formatDisplayDate = (date: Date | string | null) => {
  const parsed = date ? new Date(date) : new Date();
  return parsed.toLocaleDateString("en-CA");
};

const buildInvoiceNumber = (orderId: number) => `INV-${orderId.toString().padStart(6, "0")}`;
const buildInvoiceItemDescription = (itemName: string, priceOption: string) =>
  `${itemName} - ${priceOption} Rs Packet`;
const normalizePriceOptions = (input: unknown): Record<string, number> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const entries = Object.entries(input).filter(
    ([key, value]) => key.trim().length > 0 && typeof value === "number" && Number.isFinite(value) && value >= 0,
  );
  if (entries.length === 0) return {};
  return Object.fromEntries(entries);
};

const getDefaultPriceOptionKey = (priceOptions: Record<string, number>): string => {
  const keys = Object.keys(priceOptions);
  if (keys.length === 0) return "";
  return keys[0]!;
};

const saveInvoiceRecord = async (args: {
  orderId: number;
  shopId: number;
  distributorId: number | null;
  invoiceNumber: string;
  orderStatus: string;
  invoiceDate: Date;
  totalAmount: number;
  notes: string | null;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
}) => {
  await db
    .insert(invoicesTable)
    .values({
      orderId: args.orderId,
      shopId: args.shopId,
      distributorId: args.distributorId,
      invoiceNumber: args.invoiceNumber,
      orderStatus: args.orderStatus,
      invoiceDate: args.invoiceDate,
      totalAmount: String(args.totalAmount),
      notes: args.notes,
      items: args.items,
    })
    .onConflictDoUpdate({
      target: invoicesTable.orderId,
      set: {
        shopId: args.shopId,
        distributorId: args.distributorId,
        invoiceNumber: args.invoiceNumber,
        orderStatus: args.orderStatus,
        invoiceDate: args.invoiceDate,
        totalAmount: String(args.totalAmount),
        notes: args.notes,
        items: args.items,
      },
    });
};

const getOrderDetails = async (orderId: number) => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) {
    return null;
  }

  const distributor = order.distributorId
    ? await db
        .select({
          id: distributorsTable.id,
          name: distributorsTable.name,
          contact: distributorsTable.contact,
        })
        .from(distributorsTable)
        .where(eq(distributorsTable.id, order.distributorId))
        .then((rows) => rows[0] ?? null)
    : null;

  const [shop] = await db
    .select()
    .from(shopsTable)
    .where(eq(shopsTable.id, order.shopId));

  const lineItems = await db
    .select({
      id: orderLineItemsTable.id,
      itemId: orderLineItemsTable.itemId,
      itemName: itemsTable.name,
      itemDescription: itemsTable.description,
      priceOption: orderLineItemsTable.priceOption,
      quantity: orderLineItemsTable.quantity,
      unitPrice: orderLineItemsTable.unitPrice,
      subtotal: orderLineItemsTable.subtotal,
    })
    .from(orderLineItemsTable)
    .innerJoin(itemsTable, eq(itemsTable.id, orderLineItemsTable.itemId))
    .where(eq(orderLineItemsTable.orderId, order.id));

  if (!shop) {
    throw new Error("Order shop not found");
  }

  return {
    order,
    distributor,
    shop: {
      id: shop.id,
      regionId: shop.regionId,
      name: shop.name,
      address: shop.address ?? null,
      contactPhone: shop.contactPhone ?? null,
      createdAt: formatDateToISO(shop.createdAt),
    },
    lineItems,
  };
};

router.get("/shops/:shopId/orders", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrdersByShopParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const lineItemCounts = db
    .select({
      orderId: orderLineItemsTable.orderId,
      itemCount: sql<string>`COUNT(*)`.as("item_count"),
    })
    .from(orderLineItemsTable)
    .groupBy(orderLineItemsTable.orderId)
    .as("line_item_counts");

  const rows = await db
    .select({
      id: ordersTable.id,
      shopId: ordersTable.shopId,
      distributorId: ordersTable.distributorId,
      distributorName: distributorsTable.name,
      distributorContact: distributorsTable.contact,
      totalAmount: ordersTable.totalAmount,
      status: ordersTable.status,
      notes: ordersTable.notes,
      placedAt: ordersTable.placedAt,
      itemCount: lineItemCounts.itemCount,
    })
    .from(ordersTable)
    .leftJoin(distributorsTable, eq(distributorsTable.id, ordersTable.distributorId))
    .leftJoin(lineItemCounts, eq(lineItemCounts.orderId, ordersTable.id))
    .where(eq(ordersTable.shopId, params.data.shopId))
    .orderBy(sql`${ordersTable.placedAt} DESC`);

  res.json(rows.map(r => ({
    ...r,
    totalAmount: parseFloat(r.totalAmount),
    placedAt: formatDateToISO(r.placedAt),
    createdAt: formatDateToISO(r.placedAt),
    itemCount: parseInt(r.itemCount ?? "0", 10),
  })));
});

router.get("/invoices", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      orderId: ordersTable.id,
      regionName: regionsTable.name,
      shopName: shopsTable.name,
      totalAmount: ordersTable.totalAmount,
      placedAt: ordersTable.placedAt,
      status: ordersTable.status,
    })
    .from(ordersTable)
    .innerJoin(shopsTable, eq(shopsTable.id, ordersTable.shopId))
    .innerJoin(regionsTable, eq(regionsTable.id, shopsTable.regionId))
    .orderBy(sql`${ordersTable.placedAt} DESC`);

  res.json(
    rows.map((row) => ({
      orderId: row.orderId,
      orderNumber: `ORDER-${row.orderId.toString().padStart(6, "0")}`,
      region: row.regionName,
      shop: row.shopName,
      totalPrice: parseFloat(row.totalAmount),
      placedAt: formatDateToISO(row.placedAt),
      status: row.status,
    })),
  );
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
  const distributorId = Number((req.body as { distributorId?: unknown }).distributorId);

  if (!Number.isInteger(distributorId) || distributorId <= 0) {
    res.status(400).json({ error: "Please select a valid distributor" });
    return;
  }

  const [distributor] = await db
    .select({
      id: distributorsTable.id,
      name: distributorsTable.name,
      contact: distributorsTable.contact,
    })
    .from(distributorsTable)
    .where(eq(distributorsTable.id, distributorId));

  if (!distributor) {
    res.status(400).json({ error: "Selected distributor not found" });
    return;
  }

  // Validate items and quantity
  const itemIds = lineItems.map(li => li.itemId);
  const items = await db
    .select()
    .from(itemsTable)
    .where(inArray(itemsTable.id, itemIds));

  const itemMap = new Map(items.map(i => [i.id, i]));

  let totalAmount = 0;
  const lineItemsToInsert: Array<{ itemId: number; priceOption: string; quantity: number; unitPrice: string; subtotal: string }> = [];

  for (const li of lineItems) {
    const item = itemMap.get(li.itemId);
    if (!item) {
      res.status(400).json({ error: `Item ${li.itemId} not found` });
      return;
    }
    if (li.quantity % ORDER_QTY_STEP !== 0) {
      res.status(400).json({ error: `Quantity for ${item.name} must be in multiples of ${ORDER_QTY_STEP}` });
      return;
    }
    const normalizedPriceOptions = normalizePriceOptions(item.priceOptions);
    if (Object.keys(normalizedPriceOptions).length === 0) {
      res.status(400).json({ error: `Item ${item.name} has no price options configured` });
      return;
    }
    const selectedOption = li.priceOption && normalizedPriceOptions[li.priceOption] !== undefined
      ? li.priceOption
      : getDefaultPriceOptionKey(normalizedPriceOptions);
    const unitPrice = normalizedPriceOptions[selectedOption];
    if (unitPrice === undefined) {
      res.status(400).json({ error: `Invalid price option selected for ${item.name}` });
      return;
    }
    const subtotal = unitPrice * li.quantity;
    totalAmount += subtotal;
    lineItemsToInsert.push({
      itemId: li.itemId,
      priceOption: selectedOption,
      quantity: li.quantity,
      unitPrice: String(unitPrice),
      subtotal: String(subtotal),
    });
  }

  const [insertedOrder] = await db
    .insert(ordersTable)
    .values({
      shopId: params.data.shopId,
      distributorId: distributor.id,
      totalAmount: String(totalAmount),
      status: parsed.data.status ?? "booked",
      notes: notes ?? null,
    })
    .returning({ id: ordersTable.id });

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

  res.status(201).json({
    id: order.id,
    shopId: order.shopId,
    distributorId: order.distributorId,
    distributorName: distributor.name,
    distributorContact: distributor.contact,
    totalAmount: parseFloat(order.totalAmount),
    status: order.status,
    notes: order.notes,
    placedAt: formatDateToISO(order.placedAt),
    createdAt: formatDateToISO(order.placedAt),
    itemCount: lineItemsToInsert.length,
  });
});

router.get("/orders/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const details = await getOrderDetails(params.data.id);
  if (!details) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const { order, distributor, lineItems } = details;

  res.json({
    id: order.id,
    shopId: order.shopId,
    distributorId: order.distributorId,
    distributorName: distributor?.name ?? null,
    distributorContact: distributor?.contact ?? null,
    totalAmount: parseFloat(order.totalAmount),
    status: order.status,
    notes: order.notes,
    placedAt: formatDateToISO(order.placedAt),
    createdAt: formatDateToISO(order.placedAt),
    lineItems: lineItems.map(li => ({
      ...li,
      unitPrice: parseFloat(li.unitPrice),
      subtotal: parseFloat(li.subtotal),
    })),
  });
});

router.get("/orders/:id/invoice", requireAuth, async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const details = await getOrderDetails(params.data.id);
  if (!details) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const { order, distributor, shop, lineItems } = details;

  try {
    const invoiceNumber = buildInvoiceNumber(order.id);
    const invoiceDate = order.placedAt ? new Date(order.placedAt) : new Date();
    const payload: InvoicePayload = {
      invoiceNumber,
      invoiceDate: formatDisplayDate(invoiceDate),
      generatedAt: formatDisplayDate(new Date()),
      orderStatus: order.status,
      distributorName: distributor?.name ?? null,
      distributorContact: distributor?.contact ?? null,
      notes: order.notes,
      totalAmount: parseFloat(order.totalAmount),
      shop,
      items: lineItems.map((lineItem) => ({
        name: lineItem.itemName,
        description: buildInvoiceItemDescription(lineItem.itemName, lineItem.priceOption),
        unitPrice: parseFloat(lineItem.unitPrice),
        quantity: lineItem.quantity,
        amount: parseFloat(lineItem.subtotal),
      })),
    };
    const templatePath = await resolveInvoiceTemplatePath();
    const pdfBuffer = await generateInvoicePdf(templatePath, payload);

    await saveInvoiceRecord({
      orderId: order.id,
      shopId: order.shopId,
      distributorId: order.distributorId ?? null,
      invoiceNumber,
      orderStatus: order.status,
      invoiceDate,
      totalAmount: parseFloat(order.totalAmount),
      notes: order.notes,
      items: payload.items.map((item) => ({
        description: item.description ?? item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
      })),
    });

    res
      .status(200)
      .setHeader("Content-Type", "application/pdf")
      .setHeader("Content-Disposition", `attachment; filename="${invoiceNumber}.pdf"`)
      .send(pdfBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate invoice";
    res.status(500).json({ error: message });
  }
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
