import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogoEventos } from "../domain/modelo.ts";
import { migrate, openDatabase } from "./migrate.ts";
import { SqliteEventStore } from "./sqlite-event-store.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const catalogoPath = join(repoRoot, "data", "eventos.json");
const databasePath = join(repoRoot, "data", "e3.sqlite");

const catalogo = JSON.parse(readFileSync(catalogoPath, "utf8")) as CatalogoEventos;
const db = openDatabase(databasePath);
const applied = migrate(db);
const store = new SqliteEventStore(db);

let inserted = 0;
for (const evento of catalogo.eventos) {
  if (store.obtenerEvento(evento.id)) {
    continue;
  }
  store.guardarEvento(evento);
  inserted += 1;
}

console.log(
  `Base ${databasePath}. Migraciones nuevas: ${applied.length === 0 ? "ninguna" : applied.join(", ")}. Eventos insertados: ${inserted}.`,
);
db.close();
