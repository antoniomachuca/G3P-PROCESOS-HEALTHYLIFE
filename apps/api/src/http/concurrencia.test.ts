import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import type { Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

const PARTICIPANTES = 8;

type ResultadoHilo = { ok: boolean; estado?: string; mensaje?: string };

function ultimaPlaza(): Evento {
  return {
    id: "evt_ultima",
    titulo: "Última plaza",
    deporte: "running",
    nivel: "intermedio",
    descripcion: "Solo queda un sitio",
    inicio: "2026-10-18T10:00:00+02:00",
    fin: "2026-10-18T11:00:00+02:00",
    lugar: {
      nombre: "Pista",
      puntoEncuentro: "Salida",
      municipio: "Móstoles",
      direccion: "Campus",
      lat: 40.33,
      lng: -3.87,
    },
    aforoMaximo: 1,
    plazasDisponibles: 1,
    material: [],
    estado: "abierta",
    organizadorId: "usr_mock_001",
    communityGroupId: null,
    routineId: null,
  };
}

test("varias peticiones simultáneas a la última plaza confirman solo una y dejan el resto en espera", async () => {
  const directorio = mkdtempSync(join(tmpdir(), "g3p-35-"));
  const databasePath = join(directorio, "carrera.sqlite");
  const db = openDatabase(databasePath);
  migrate(db);
  new SqliteEventStore(db).guardarEvento(ultimaPlaza());
  db.close();

  const resultados = await Promise.all(
    Array.from({ length: PARTICIPANTES }, (_, indice) =>
      reservarEnOtroHilo(databasePath, "evt_ultima", `usr_mock_${indice}`),
    ),
  );

  const fallos = resultados.filter((resultado) => !resultado.ok);
  assert.deepEqual(
    fallos.map((fallo) => fallo.mensaje),
    [],
    "ninguna petición simultánea debe fallar: la que no entra pasa a lista de espera",
  );

  const confirmadas = resultados.filter((resultado) => resultado.estado === "confirmada");
  const enEspera = resultados.filter((resultado) => resultado.estado === "en_espera");
  assert.equal(confirmadas.length, 1);
  assert.equal(enEspera.length, PARTICIPANTES - 1);

  const comprobacion = openDatabase(databasePath);
  assert.deepEqual(integridad(comprobacion, "evt_ultima"), {
    capacidad: 1,
    plazasLibres: 0,
    confirmadas: 1,
    enEspera: PARTICIPANTES - 1,
  });
  comprobacion.close();
});

test("dos POST simultáneos a la última plaza dejan una confirmada y otra en espera", async () => {
  const db = openDatabase(":memory:");
  migrate(db);
  const store = new SqliteEventStore(db);
  store.guardarEvento(ultimaPlaza());
  const servidor = createServer((req, res) => {
    manejarReservas(store, req, res);
  });
  await new Promise<void>((resolve) => {
    servidor.listen(0, "127.0.0.1", () => resolve());
  });
  const puerto = (servidor.address() as AddressInfo).port;

  const respuestas = await Promise.all(
    ["usr_mock_a", "usr_mock_b"].map(async (usuarioId) => {
      const respuesta = await fetch(`http://127.0.0.1:${puerto}/api/v1/events/evt_ultima/reservations`, {
        method: "POST",
        headers: { "X-User-Id": usuarioId },
      });
      const cuerpo = (await respuesta.json()) as { estado: string; plazasDisponibles: number };
      return { status: respuesta.status, ...cuerpo };
    }),
  );

  assert.deepEqual(
    respuestas.map((respuesta) => respuesta.status),
    [201, 201],
  );
  assert.deepEqual(respuestas.map((respuesta) => respuesta.estado).sort(), ["confirmada", "en_espera"]);
  assert.deepEqual(integridad(db, "evt_ultima"), {
    capacidad: 1,
    plazasLibres: 0,
    confirmadas: 1,
    enEspera: 1,
  });
  servidor.close();
  db.close();
});

function integridad(db: DatabaseSync, eventoId: string) {
  const aforo = db.prepare("SELECT capacidad, plazas_libres FROM eventos WHERE id = ?").get(eventoId) as {
    capacidad: number;
    plazas_libres: number;
  };
  const porEstado = db
    .prepare("SELECT estado, COUNT(*) AS total FROM reservas WHERE evento_id = ? GROUP BY estado")
    .all(eventoId) as unknown as { estado: string; total: number }[];
  const total = (estado: string) => porEstado.find((fila) => fila.estado === estado)?.total ?? 0;
  assert.ok(aforo.plazas_libres >= 0);
  assert.ok(aforo.plazas_libres <= aforo.capacidad);
  assert.equal(total("confirmada") + aforo.plazas_libres, aforo.capacidad);
  return {
    capacidad: aforo.capacidad,
    plazasLibres: aforo.plazas_libres,
    confirmadas: total("confirmada"),
    enEspera: total("en_espera"),
  };
}

function reservarEnOtroHilo(databasePath: string, eventoId: string, usuarioId: string): Promise<ResultadoHilo> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./reservar-worker.ts", import.meta.url), {
      workerData: { databasePath, eventoId, usuarioId },
    });
    worker.once("message", (mensaje: ResultadoHilo) => resolve(mensaje));
    worker.once("error", reject);
  });
}
