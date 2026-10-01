import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogoEventos } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

const PUERTO = 3001;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

export function crearAlmacen(): SqliteEventStore {
  const db = openDatabase(join(repoRoot, "data", "e3.sqlite"));
  migrate(db);
  const store = new SqliteEventStore(db);
  const catalogo = JSON.parse(readFileSync(join(repoRoot, "data", "eventos.json"), "utf8")) as CatalogoEventos;
  for (const evento of catalogo.eventos) {
    if (!store.obtenerEvento(evento.id)) {
      store.guardarEvento(evento);
    }
  }
  return store;
}

const esPrincipal = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (esPrincipal) {
  const store = crearAlmacen();
  const servidor = createServer((req, res) => {
    manejarReservas(store, req, res);
  });
  servidor.listen(PUERTO, () => {
    console.log(`API de reservas en http://127.0.0.1:${PUERTO}/api/v1/events/{id}/reservations`);
  });
}
