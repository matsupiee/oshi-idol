import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import { TransactionRollbackError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type { AppDb } from "../src/index";
import * as schema from "../src/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// マイグレーションファイルの 0001 に存在しないカラムへの SELECT バグがあるため、
// テスト環境では最終スキーマ定義から直接テーブルを作成する。
const SCHEMA_SQL = readFileSync(path.resolve(__dirname, "schema.sql"), "utf-8");

export type TestDb = AppDb;

/**
 * in-memory SQLite の TestDb を返す。
 * 各テストで呼ぶことでテスト間の状態を完全に分離できる。
 */
export function getTestDb(): TestDb {
  const client = createClient({ url: ":memory:" });
  return drizzle(client, { schema }) as unknown as TestDb;
}

/**
 * テスト用スキーマを適用する。
 */
export async function runMigrations(db: TestDb) {
  const client = (db as unknown as { $client: ReturnType<typeof createClient> }).$client;
  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
}

/**
 * コネクションを閉じる。
 */
export async function closeTestDb(db: TestDb) {
  const raw = db as unknown as { $client: { close(): void } };
  raw.$client.close();
}

/**
 * トランザクション内で fn を実行し、必ずロールバックする。
 * db.batch() を使うルータ層テストには向かない（batch はトランザクション外）。
 * DB 操作を直接テストする場合に使う。
 */
export async function withRollback<T>(db: TestDb, fn: (tx: TestDb) => Promise<T>): Promise<T> {
  let result: T;
  try {
    await (db as unknown as ReturnType<typeof drizzle>).transaction(async (tx) => {
      result = await fn(tx as unknown as TestDb);
      (tx as { rollback(): never }).rollback();
    });
  } catch (e) {
    if (e instanceof TransactionRollbackError) {
      return result!;
    }
    throw e;
  }
  return result!;
}
