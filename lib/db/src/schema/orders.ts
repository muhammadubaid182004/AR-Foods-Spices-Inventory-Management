import { mysqlTable, text, int, timestamp, decimal } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shopsTable } from "./shops";
import { itemsTable } from "./items";

export const ordersTable = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  shopId: int("shop_id").notNull().references(() => shopsTable.id, { onDelete: "cascade" }),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  placedAt: timestamp("placed_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderLineItemsTable = mysqlTable("order_line_items", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  itemId: int("item_id").notNull().references(() => itemsTable.id, { onDelete: "restrict" }),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export const insertOrderLineItemSchema = createInsertSchema(orderLineItemsTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderLineItem = typeof orderLineItemsTable.$inferSelect;
