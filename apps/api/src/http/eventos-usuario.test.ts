import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { openDatabase, migrate } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";
import type { Evento } from "../domain/modelo.ts";

function almacenEnMemoria(): SqliteEventStore {
  const db = openDatabase(":memory:");
  migrate(db);
  const store = new SqliteEventStore(db);
  const evento1: Evento = {
    id: "evt_test1",
    titulo: "Carrera 5K Campus",
    deporte: "running",
    nivel: "intermedio",
    descripcion: "Entrenamiento de carrera continua",
    inicio: "2026-10-20T10:00:00+02:00",
    fin: "2026-10-20T11:00:00+02:00",
    lugar: {
      nombre: "Parque Central",
      puntoEncuentro: "Entrada principal",
      municipio: "Móstoles",
      direccion: "Campus Móstoles URJC",
      lat: 40.3347,
      lng: -3.8754,
    },
    aforoMaximo: 20,
    plazasDisponibles: 15,
    material: ["Zapatillas"],
    estado: "abierta",
    organizadorId: "usr_mock_001",
    communityGroupId: null,
    routineId: null,
  };
  const evento2: Evento = {
    id: "evt_test2",
    titulo: "Clase de Yoga Matinal",
    deporte: "yoga",
    nivel: "iniciacion",
    descripcion: "Sesión suave de yoga",
    inicio: "2026-10-25T09:00:00+02:00",
    fin: "2026-10-25T10:00:00+02:00",
    lugar: {
      nombre: "Polideportivo",
      puntoEncuentro: "Sala 2",
      municipio: "Alcorcón",
      direccion: "Campus Alcorcón URJC",
      lat: 40.3406,
      lng: -3.8264,
    },
    aforoMaximo: 10,
    plazasDisponibles: 8,
    material: ["Esterilla"],
    estado: "abierta",
    organizadorId: "usr_mock_001",
    communityGroupId: null,
    routineId: null,
  };
  store.guardarEvento(evento1);
  store.guardarEvento(evento2);
  return store;
}

async function conServidor(store: SqliteEventStore, fn: (url: string) => Promise<void>): Promise<void> {
  const server: Server = createServer((req, res) => {
    manejarReservas(store, req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("GET /api/v1/users/{user_id}/events devuelve la lista de eventos en formato Grupo 2 y estándar", async () => {
  const store = almacenEnMemoria();
  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/users/usuario-demo-001/events`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.user_id, "usuario-demo-001");
    assert.equal(data.userId, undefined);
    assert.ok(Array.isArray(data.events));
    assert.equal(data.events.length, 2);

    const primerEvento = data.events[0];
    assert.equal(primerEvento.event_id, "evt_test1");
    assert.equal(primerEvento.eventId, undefined);
    assert.equal(primerEvento.name, "Carrera 5K Campus");
    assert.equal(primerEvento.type, "running");
    assert.match(primerEvento.location, /Parque Central/);
    assert.equal(primerEvento.available_places, 15);
    assert.deepEqual(primerEvento.activity_dates, ["2026-10-20"]);
    assert.equal(primerEvento.estimated_calories, 500); // 1 hora de running
    assert.equal(primerEvento.enrolled, false);
  });
});

test("GET /users/{user_id}/events (ruta directa de la propuesta E2) funciona idénticamente", async () => {
  const store = almacenEnMemoria();
  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/users/usuario-demo-001/events`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.user_id, "usuario-demo-001");
    assert.equal(data.events.length, 2);
  });
});

test("Usuario con reserva confirmada devuelve su evento específico con enrolled=true", async () => {
  const store = almacenEnMemoria();
  // El usuario reserva en evt_test2
  store.reservar("evt_test2", "usr_inscrito_01");

  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/users/usr_inscrito_01/events`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.user_id, "usr_inscrito_01");
    assert.equal(data.events.length, 1);
    assert.equal(data.events[0].event_id, "evt_test2");
    assert.equal(data.events[0].enrolled, true);
    assert.equal(data.events[0].available_places, 7); // Quedaban 8, bajó a 7
  });
});

test("Filtro ?only_enrolled=true devuelve array vacío si el usuario no tiene reservas", async () => {
  const store = almacenEnMemoria();
  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/users/usuario-sin-reservas/events?only_enrolled=true`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.user_id, "usuario-sin-reservas");
    assert.deepEqual(data.events, []);
  });
});

test("Métodos no permitidos responden 405 Method Not Allowed", async () => {
  const store = almacenEnMemoria();
  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/users/usuario-demo-001/events`, {
      method: "POST",
    });
    assert.equal(res.status, 405);
  });
});
