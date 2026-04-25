import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const distributorsTable = pgTable("distributors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contact: text("contact"),
});

export const insertDistributorSchema = createInsertSchema(distributorsTable).omit({ id: true });
export type InsertDistributor = z.infer<typeof insertDistributorSchema>;
export type Distributor = typeof distributorsTable.$inferSelect;
