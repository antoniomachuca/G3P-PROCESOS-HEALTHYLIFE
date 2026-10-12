import { parentPort, workerData } from "node:worker_threads";
import { openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";

const datos = workerData as { databasePath: string; eventoId: string; usuarioId: string };
const db = openDatabase(datos.databasePath);
const store = new SqliteEventStore(db);

try {
  const resultado = store.reservar(datos.eventoId, datos.usuarioId);
  parentPort?.postMessage({ ok: true, estado: resultado.reserva.estado, plazasDisponibles: resultado.plazasDisponibles });
} catch (error) {
  parentPort?.postMessage({ ok: false, mensaje: error instanceof Error ? error.message : "error" });
} finally {
  db.close();
}
