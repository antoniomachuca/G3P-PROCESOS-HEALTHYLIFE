import { createServer } from "node:http";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JsonEventStore } from "../db/json-event-store.ts";
import { manejarCatalogo } from "./catalogo.ts";

const PUERTO = 3001;
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

const esPrincipal = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];

if (esPrincipal) {
  const store = new JsonEventStore(join(repoRoot, "data", "eventos.json"));
  const servidor = createServer((req, res) => {
    manejarCatalogo(store, req, res);
  });
  servidor.listen(PUERTO, () => {
    console.log(`API de eventos en http://127.0.0.1:${PUERTO}/api/v1/events`);
  });
}
