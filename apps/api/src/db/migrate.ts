import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "migrations");

export function openDatabase(path: string): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

export function migrate(db: DatabaseSync): string[] {
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    ) STRICT
  `);

  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  const applied = new Set(
    db.prepare("SELECT id FROM schema_migrations").all().map((row) => String(row.id)),
  );
  const newlyApplied: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
        file,
        new Date().toISOString(),
      );
      db.exec("COMMIT");
      newlyApplied.push(file);
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }

  return newlyApplied;
}
