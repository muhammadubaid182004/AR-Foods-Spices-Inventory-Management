import { pgTable, text, serial, timestamp, integer, json, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";
import { shopsTable } from "./shops";
import { distributorsTable } from "./distributors";

export const invoicesTable = pgTable(
  "invoices",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id").references(() => ordersTable.id, { onDelete: "cascade" }).notNull(),
    shopId: integer("shop_id").references(() => shopsTable.id, { onDelete: "cascade" }).notNull(),
    distributorId: integer("distributor_id").references(() => distributorsTable.id, { onDelete: "set null" }),
    invoiceNumber: text("invoice_number").notNull(),
    orderStatus: text("order_status").notNull(),
    invoiceDate: timestamp("invoice_date").notNull(),
    totalAmount: text("total_amount").notNull(),
    notes: text("notes"),
    items: json("items").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    orderUniqueIdx: uniqueIndex("invoices_order_id_unique").on(table.orderId),
    invoiceNumberUniqueIdx: uniqueIndex("invoices_invoice_number_unique").on(table.invoiceNumber),
  }),
);

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
