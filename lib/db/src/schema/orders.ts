import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { shopsTable } from "./shops";
import { itemsTable } from "./items";
import { distributorsTable } from "./distributors";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").references(() => shopsTable.id, { onDelete: "cascade" }).notNull(),
  distributorId: integer("distributor_id").references(() => distributorsTable.id, { onDelete: "set null" }),
  totalAmount: text("total_amount").notNull().default("0"),
  status: text("status").notNull().default("booked"),
  notes: text("notes"),
  placedAt: timestamp("placed_at").notNull().defaultNow(),
});

export const orderLineItemsTable = pgTable("order_line_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "cascade" }).notNull(),
  itemId: integer("item_id").references(() => itemsTable.id, { onDelete: "restrict" }).notNull(),
  priceOption: text("price_option").notNull().default(""),
  quantity: serial("quantity").notNull(),
  unitPrice: text("unit_price").notNull(),
  subtotal: text("subtotal").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true });
export const insertOrderLineItemSchema = createInsertSchema(orderLineItemsTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderLineItem = typeof orderLineItemsTable.$inferSelect;
