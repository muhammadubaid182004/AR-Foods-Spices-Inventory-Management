import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const itemsTable = pgTable("items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unitPrice: text("unit_price").notNull(),
  minOrderQty: serial("min_order_qty").notNull().default(1),
  stockQuantity: serial("stock_quantity").notNull().default(0),
  category: text("category"),
  sku: text("sku"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertItemSchema = createInsertSchema(itemsTable).omit({ id: true, createdAt: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof itemsTable.$inferSelect;
