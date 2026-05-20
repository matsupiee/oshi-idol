import { env } from "@oshi-idol/env/server";
import { drizzle } from "drizzle-orm/d1";
import type { BatchItem, BatchResponse } from "drizzle-orm/batch";
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core";

import * as schema from "./schema";

export type AppDb = BaseSQLiteDatabase<"async", unknown, typeof schema> & {
  batch<U extends BatchItem<"sqlite">, T extends Readonly<[U, ...U[]]>>(
    batch: T,
  ): Promise<BatchResponse<T>>;
  batch(batch: BatchItem<"sqlite">[]): Promise<unknown[]>;
};

export function createDb(): AppDb {
  return drizzle(env.DB, { schema }) as AppDb;
}
