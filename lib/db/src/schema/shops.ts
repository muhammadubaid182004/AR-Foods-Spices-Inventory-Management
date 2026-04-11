import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { regionsTable } from "./regions";

export const shopsTable = pgTable("shops", {
  id: serial("id").primaryKey(),
  regionId: integer("region_id").notNull().references(() => regionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;
