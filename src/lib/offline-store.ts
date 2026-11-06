// Saved responses: Capacitor SQLite on Android, browser storage on the web.
import { isNative } from "./native";

export type SavedItem = {
  id: string;
  question: string;
  answer: string;
  image?: string | null;
  createdAt: number;
};

const WEB_KEY = "aiplex_saved_v1";
const DB_NAME = "aiplex";

type Db = {
  execute: (sql: string) => Promise<unknown>;
  run: (sql: string, values?: unknown[]) => Promise<unknown>;
  query: (sql: string, values?: unknown[]) => Promise<{ values?: unknown[] }>;
};
let dbPromise: Promise<Db> | null = null;

async function nativeDb(): Promise<Db> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      const exists = (await sqlite.isConnection(DB_NAME, false)).result;
      const db = exists
        ? await sqlite.retrieveConnection(DB_NAME, false)
        : await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
      await db.open();
      await db.execute(
        "CREATE TABLE IF NOT EXISTS saved (id TEXT PRIMARY KEY, question TEXT, answer TEXT, image TEXT, created_at INTEGER);",
      );
      return db as unknown as Db;
    })();
  }
  return dbPromise;
}

function webAll(): SavedItem[] {
  try {
    return JSON.parse(localStorage.getItem(WEB_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function webWrite(items: SavedItem[]) {
  try {
    localStorage.setItem(WEB_KEY, JSON.stringify(items));
  } catch {
    throw new Error("Device storage is full. Delete some saved items and try again.");
  }
}

export async function saveItem(item: SavedItem) {
  if (isNative()) {
    const db = await nativeDb();
    await db.run("INSERT OR REPLACE INTO saved (id, question, answer, image, created_at) VALUES (?,?,?,?,?);", [
      item.id,
      item.question,
      item.answer,
      item.image ?? null,
      item.createdAt,
    ]);
    return;
  }
  webWrite([item, ...webAll().filter((i) => i.id !== item.id)]);
}

export async function listItems(): Promise<SavedItem[]> {
  if (isNative()) {
    const db = await nativeDb();
    const res = await db.query("SELECT * FROM saved ORDER BY created_at DESC;");
    return (res.values ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        id: String(row['id']),
        question: String(row['question'] ?? ""),
        answer: String(row['answer'] ?? ""),
        image: (row['image'] as string) ?? null,
        createdAt: Number(row['created_at']),
      };
    });
  }
  return webAll().sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteItem(id: string) {
  if (isNative()) {
    const db = await nativeDb();
    await db.run("DELETE FROM saved WHERE id = ?;", [id]);
    return;
  }
  webWrite(webAll().filter((i) => i.id !== id));
}

export async function isSaved(id: string) {
  return (await listItems()).some((i) => i.id === id);
}

export function searchItems(items: SavedItem[], q: string) {
  const term = q.trim().toLowerCase();
  if (!term) return items;
  return items.filter((i) => i.question.toLowerCase().includes(term) || i.answer.toLowerCase().includes(term));
}
