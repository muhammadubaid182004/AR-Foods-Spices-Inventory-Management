import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = postgres(process.env.DATABASE_URL);
export const db = drizzle(pool, {
  schema,
});

void pool`select 1`
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch(() => {
    // Keep startup behavior unchanged; connection errors are handled where queries execute.
  });

export * from "./schema";
