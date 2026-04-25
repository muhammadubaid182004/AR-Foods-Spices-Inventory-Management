import { Router, type IRouter } from "express";
import { db, distributorsTable } from "@workspace/db";
import { asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth-middleware";

const router: IRouter = Router();

router.get("/distributors", requireAuth, async (_req, res): Promise<void> => {
  const distributors = await db
    .select({
      id: distributorsTable.id,
      name: distributorsTable.name,
      contact: distributorsTable.contact,
    })
    .from(distributorsTable)
    .orderBy(asc(distributorsTable.name));

  res.json(distributors);
});

export default router;
