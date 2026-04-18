import { mysqlTable, text, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { regionsTable } from "./regions";

export const shopsTable = mysqlTable("shops", {
  id: int("id").primaryKey().autoincrement(),
  regionId: int("region_id").notNull().references(() => regionsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address"),
  contactPhone: text("contact_phone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertShopSchema = createInsertSchema(shopsTable).omit({ id: true, createdAt: true });
export type InsertShop = z.infer<typeof insertShopSchema>;
export type Shop = typeof shopsTable.$inferSelect;
