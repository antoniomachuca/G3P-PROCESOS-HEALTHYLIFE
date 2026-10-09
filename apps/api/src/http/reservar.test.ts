import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import type { Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

function eventoDePrueba(cambios: Partial<Evento> = {}): Evento {
  return {
    id: "evt_test",
    titulo: "Pádel de prueba",
    deporte: "padel",
    nivel: "iniciacion",
    descripcion: "Partido corto",
    inicio: "2026-10-18T10:00:00+02:00",
    fin: "2026-10-18T11:30:00+02:00",
    lugar: {
      nombre: "Pistas",
      puntoEncuentro: "Entrada",
      municipio: "Alcorcón",
      direccion: "Campus",
      lat: 40.34,
      lng: -3.82,
    },
    aforoMaximo: 2,
    plazasDisponibles: 2,
    material: ["Pala"],
    estado: "abierta",
    organizadorId: "usr_mock_001",
    communityGroupId: null,
    routineId: null,
    ...cambios,
  };
}

function almacen(): SqliteEventStore {
  const db = openDatabase(":memory:");
  migrate(db);
  return new SqliteEventStore(db);
}

test("con plazas libres confirma la reserva y baja el aforo en uno", () => {
  const store = almacen();
  store.guardarEvento(eventoDePrueba());

  const resultado = store.reservar("evt_test", "usr_mock_010");

  assert.equal(resultado.reserva.estado, "confirmada");
  assert.equal(resultado.plazasDisponibles, 1);
  assert.match(resultado.reserva.id, /^ins_/);
  assert.match(resultado.reserva.creadaEn, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  assert.equal(store.obtenerEvento("evt_test")?.plazasDisponibles, 1);
});

test("dos reservas de la última plaza dejan una confirmada, otra en espera y el aforo en cero", () => {
  const store = almacen();
  store.guardarEvento(eventoDePrueba({ aforoMaximo: 1, plazasDisponibles: 1 }));

  const primera = store.reservar("evt_test", "usr_mock_010");
  const segunda = store.reservar("evt_test", "usr_mock_011");

  assert.equal(primera.reserva.estado, "confirmada");
  assert.equal(segunda.reserva.estado, "en_espera");
  assert.equal(store.obtenerEvento("evt_test")?.plazasDisponibles, 0);
  assert.equal(store.listarReservas("evt_test").filter((reserva) => reserva.estado === "confirmada").length, 1);
});

test("un evento cerrado o inexistente no crea reserva ni toca el aforo", () => {
  const store = almacen();
  store.guardarEvento(eventoDePrueba({ id: "evt_cerrado", estado: "cancelada", plazasDisponibles: 2 }));

  assert.throws(() => store.reservar("evt_ausente", "usr_mock_010"), /No existe ese evento/);
  assert.throws(() => store.reservar("evt_cerrado", "usr_mock_010"), /no admite reservas/);
  assert.equal(store.listarReservas("evt_cerrado").length, 0);
  assert.equal(store.obtenerEvento("evt_cerrado")?.plazasDisponibles, 2);
});

test("POST /api/v1/events/{id}/reservations devuelve la plaza confirmada", async () => {
  const store = almacen();
  store.guardarEvento(eventoDePrueba({ aforoMaximo: 1, plazasDisponibles: 1 }));
  const servidor = createServer((req, res) => {
    manejarReservas(store, req, res);
  });
  await escuchar(servidor);
  const puerto = (servidor.address() as AddressInfo).port;

  const confirmada = await fetch(`http://127.0.0.1:${puerto}/api/v1/events/evt_test/reservations`, {
    method: "POST",
    headers: { "X-User-Id": "usr_mock_010", Origin: "http://localhost:5173" },
  });
  const cuerpoConfirmada = (await confirmada.json()) as { estado: string; plazasDisponibles: number };
  assert.equal(confirmada.status, 201);
  assert.equal(confirmada.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.equal(cuerpoConfirmada.estado, "confirmada");
  assert.equal(cuerpoConfirmada.plazasDisponibles, 0);

  const espera = await fetch(`http://127.0.0.1:${puerto}/api/v1/events/evt_test/reservations`, {
    method: "POST",
    headers: { "X-User-Id": "usr_mock_011" },
  });
  const cuerpoEspera = (await espera.json()) as { estado: string; plazasDisponibles: number };
  assert.equal(espera.status, 201);
  assert.equal(cuerpoEspera.estado, "en_espera");
  assert.equal(cuerpoEspera.plazasDisponibles, 0);

  const sinUsuario = await fetch(`http://127.0.0.1:${puerto}/api/v1/events/evt_test/reservations`, { method: "POST" });
  assert.equal(sinUsuario.status, 400);
  servidor.close();
});

test("GET /api/v1/events lista eventos abiertos y no finalizados", async () => {
  const store = almacen();
  store.guardarEvento(eventoDePrueba({ id: "evt_activo" }));
  store.guardarEvento(eventoDePrueba({ id: "evt_cerrado", estado: "cancelada" }));
  store.guardarEvento(eventoDePrueba({
    id: "evt_pasado",
    inicio: "2026-09-12T18:00:00+02:00",
    fin: "2026-09-12T19:00:00+02:00",
  }));
  const servidor = createServer((req, res) => {
    manejarReservas(store, req, res);
  });
  await escuchar(servidor);
  const puerto = (servidor.address() as AddressInfo).port;

  const respuesta = await fetch(`http://127.0.0.1:${puerto}/api/v1/events`, {
    headers: { Origin: "http://localhost:5173" },
  });
  const cuerpo = (await respuesta.json()) as { eventos: Evento[] };

  assert.equal(respuesta.status, 200);
  assert.equal(respuesta.headers.get("access-control-allow-origin"), "http://localhost:5173");
  assert.deepEqual(cuerpo.eventos.map((evento) => evento.id), ["evt_activo"]);
  servidor.close();
});

test("dos peticiones concurrentes sobre la última plaza no dejan el aforo en negativo", async () => {
  const directorio = mkdtempSync(join(tmpdir(), "g3p-34-"));
  const databasePath = join(directorio, "carrera.sqlite");
  const db = openDatabase(databasePath);
  migrate(db);
  const store = new SqliteEventStore(db);
  store.guardarEvento(eventoDePrueba({ id: "evt_carrera", aforoMaximo: 1, plazasDisponibles: 1 }));
  db.close();

  const resultados = await Promise.all([
    reservarEnOtroHilo(databasePath, "evt_carrera", "usr_mock_a"),
    reservarEnOtroHilo(databasePath, "evt_carrera", "usr_mock_b"),
  ]);

  const comprobacion = openDatabase(databasePath);
  const despues = new SqliteEventStore(comprobacion);
  const plazas = despues.obtenerEvento("evt_carrera")?.plazasDisponibles;
  const estados = resultados.map((resultado) => resultado.estado).sort();
  assert.deepEqual(estados, ["confirmada", "en_espera"]);
  assert.equal(plazas, 0);
  comprobacion.close();
});

function escuchar(servidor: Server): Promise<void> {
  return new Promise((resolve) => {
    servidor.listen(0, "127.0.0.1", () => resolve());
  });
}

function reservarEnOtroHilo(
  databasePath: string,
  eventoId: string,
  usuarioId: string,
): Promise<{ ok: boolean; estado?: string; mensaje?: string }> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./reservar-worker.ts", import.meta.url), {
      workerData: { databasePath, eventoId, usuarioId },
    });
    worker.once("message", (mensaje: { ok: boolean; estado?: string; mensaje?: string }) => resolve(mensaje));
    worker.once("error", reject);
  });
}

test("POST /api/v1/events crea un nuevo evento", async () => {
  const store = almacen();
  const servidor = createServer((req, res) => {
    manejarReservas(store, req, res);
  });
  await escuchar(servidor);
  const puerto = (servidor.address() as AddressInfo).port;

  const respuestaBuena = await fetch(`http://127.0.0.1:${puerto}/api/v1/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: "Futbol de prueba",
      deporte: "futbol",
      nivel: "intermedio",
      descripcion: "Partido",
      inicio: "2099-01-01T10:00:00Z",
      fin: "2099-01-01T11:00:00Z",
      lugar: { nombre: "A", puntoEncuentro: "B", municipio: "C", direccion: "D", lat: 0, lng: 0 },
      aforoMaximo: 20,
      material: [],
      organizadorId: "usr_mock_010",
      communityGroupId: null,
      routineId: null
    })
  });
  const cuerpoBueno = await respuestaBuena.json() as Evento;
  assert.equal(respuestaBuena.status, 201);
  assert.equal(cuerpoBueno.plazasDisponibles, 20);
  assert.equal(store.obtenerEvento(cuerpoBueno.id)?.plazasDisponibles, 20);

  const respuestaMala = await fetch(`http://127.0.0.1:${puerto}/api/v1/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      titulo: "Futbol Pasado",
      deporte: "futbol",
      nivel: "intermedio",
      descripcion: "Partido",
      inicio: "2020-01-01T10:00:00Z",
      fin: "2020-01-01T11:00:00Z",
      lugar: { nombre: "A", puntoEncuentro: "B", municipio: "C", direccion: "D", lat: 0, lng: 0 },
      aforoMaximo: 20,
      material: [],
      organizadorId: "usr_mock_010",
      communityGroupId: null,
      routineId: null
    })
  });
  assert.equal(respuestaMala.status, 400);

  servidor.close();
});
