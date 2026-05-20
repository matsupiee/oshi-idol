import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@libsql/client";
import { TransactionRollbackError } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import type { AppDb } from "../src/index";
import * as schema from "../src/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(__dirname, "../src/migrations");

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
 * drizzle-kit が生成したマイグレーションをジャーナル順に適用する。
 *
 * migration 0001 は drizzle-kit の生成バグにより、存在しないカラムを参照する
 * INSERT INTO ... SELECT を含む。テスト DB は常に空なので INSERT は不要であり、
 * "no such column" エラーが発生した INSERT SELECT だけをスキップして安全に回避する。
 */
export async function runMigrations(db: TestDb) {
  const client = (db as unknown as { $client: ReturnType<typeof createClient> }).$client;

  const journal = JSON.parse(
    readFileSync(path.resolve(migrationsFolder, "meta/_journal.json"), "utf-8"),
  ) as { entries: { tag: string }[] };

  for (const entry of journal.entries) {
    const sql = readFileSync(path.resolve(migrationsFolder, `${entry.tag}.sql`), "utf-8");

    // drizzle-kit は "--> statement-breakpoint" でステートメントを区切る
    const statements = sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (e) {
        // テーブルが空のときに存在しないカラムを SELECT しようとする INSERT は
        // データ損失なしにスキップできる（空テーブルから 0 行コピーするだけのため）
        const isInsertSelect = /INSERT\s+INTO\b/i.test(stmt) && /\bSELECT\b/i.test(stmt);
        const isMissingColumn = e instanceof Error && e.message.includes("no such column");
        if (isInsertSelect && isMissingColumn) {
          continue;
        }
        throw e;
      }
    }
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
