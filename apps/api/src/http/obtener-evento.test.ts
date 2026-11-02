import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import type { Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

function eventoDePrueba(cambios: Partial<Evento> = {}): Evento {
  return {
    id: "evt_edicion",
    titulo: "Yoga al aire libre",
    deporte: "yoga",
    nivel: "intermedio",
    descripcion: "Sesión de estiramientos",
    inicio: "2028-11-20T18:00:00+01:00",
    fin: "2028-11-20T19:30:00+01:00",
    lugar: {
      nombre: "Jardín central",
      puntoEncuentro: "Fuente del jardín",
      municipio: "Fuenlabrada",
      direccion: "Campus de Fuenlabrada",
      lat: 40.28,
      lng: -3.81,
    },
    aforoMaximo: 12,
    plazasDisponibles: 9,
    material: ["Esterilla", "Toalla"],
    estado: "abierta",
    organizadorId: "usr_mock_001",
    communityGroupId: null,
    routineId: null,
    ...cambios,
  };
}

async function conServidor(store: SqliteEventStore, prueba: (base: string) => Promise<void>): Promise<void> {
  const servidor: Server = createServer((req, res) => manejarReservas(store, req, res));
  await new Promise<void>((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  const { port } = servidor.address() as AddressInfo;
  try {
    await prueba(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
  }
}

function almacen(): SqliteEventStore {
  const db = openDatabase(":memory:");
  migrate(db);
  return new SqliteEventStore(db);
}

test("GET /api/v1/events/{id} devuelve el evento guardado en SQLite con sus datos actuales", async () => {
  const store = almacen();
  store.guardarEvento(eventoDePrueba());
  store.reservar("evt_edicion", "usr_mock_020");

  await conServidor(store, async (base) => {
    const respuesta = await fetch(`${base}/api/v1/events/evt_edicion`);
    assert.equal(respuesta.status, 200);
    const evento = (await respuesta.json()) as Evento;
    assert.equal(evento.titulo, "Yoga al aire libre");
    assert.equal(evento.lugar.puntoEncuentro, "Fuente del jardín");
    assert.deepEqual(evento.material, ["Esterilla", "Toalla"]);
    assert.equal(evento.aforoMaximo, 12);
    // La reserva hecha arriba ya está reflejada: se lee la base, no la semilla.
    assert.equal(evento.plazasDisponibles, 8);
  });
});

test("GET /api/v1/events/{id} devuelve también eventos fuera del catálogo activo", async () => {
  const store = almacen();
  store.guardarEvento(eventoDePrueba({ id: "evt_cancelado", estado: "cancelada" }));

  await conServidor(store, async (base) => {
    const respuesta = await fetch(`${base}/api/v1/events/evt_cancelado`);
    assert.equal(respuesta.status, 200);
    assert.equal(((await respuesta.json()) as Evento).estado, "cancelada");
  });
});

test("GET /api/v1/events/{id} de un evento inexistente responde 404 en español", async () => {
  await conServidor(almacen(), async (base) => {
    const respuesta = await fetch(`${base}/api/v1/events/evt_no_existe`);
    assert.equal(respuesta.status, 404);
    assert.deepEqual(await respuesta.json(), { mensaje: "Evento no encontrado" });
  });
});
