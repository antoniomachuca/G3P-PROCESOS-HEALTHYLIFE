import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import type { Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

function eventoFuturo(id = "evt_futuro"): Evento {
  const inicioFuturo = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const finFuturo = new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString();
  return {
    id,
    titulo: "Actividad en el futuro",
    deporte: "padel",
    nivel: "iniciacion",
    descripcion: "Partido programado para mañana",
    inicio: inicioFuturo,
    fin: finFuturo,
    lugar: {
      nombre: "Polideportivo URJC",
      puntoEncuentro: "Pista central",
      municipio: "Fuenlabrada",
      direccion: "Camino del Molino s/n",
      lat: 40.28,
      lng: -3.81,
    },
    aforoMaximo: 4,
    plazasDisponibles: 3,
    material: ["Pala de pádel"],
    estado: "abierta",
    organizadorId: "usr_org_001",
    communityGroupId: null,
    routineId: null,
  };
}

function eventoPasado(id = "evt_pasado"): Evento {
  const inicioPasado = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const finFuturo = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString();
  return {
    id,
    titulo: "Actividad ya iniciada",
    deporte: "running",
    nivel: "intermedio",
    descripcion: "Entrenamiento que comenzó hace dos horas",
    inicio: inicioPasado,
    fin: finFuturo,
    lugar: {
      nombre: "Pista de atletismo",
      puntoEncuentro: "Gradas",
      municipio: "Móstoles",
      direccion: "Campus Móstoles",
      lat: 40.33,
      lng: -3.87,
    },
    aforoMaximo: 10,
    plazasDisponibles: 9,
    material: [],
    estado: "abierta",
    organizadorId: "usr_org_001",
    communityGroupId: null,
    routineId: null,
  };
}

function inicializarStore(): SqliteEventStore {
  const db = openDatabase(":memory:");
  migrate(db);
  return new SqliteEventStore(db);
}

async function conServidor(
  store: SqliteEventStore,
  bloque: (urlBase: string) => Promise<void>,
): Promise<void> {
  const servidor: Server = createServer((req, res) => {
    manejarReservas(store, req, res);
  });
  await new Promise<void>((resolver) => servidor.listen(0, "127.0.0.1", () => resolver()));
  const puerto = (servidor.address() as AddressInfo).port;
  try {
    await bloque(`http://127.0.0.1:${puerto}`);
  } finally {
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
  }
}

test("G3P-60: DELETE /api/v1/events/:id/reservations cancela la reserva y la pasa a estado 'cancelada' en SQLite", async () => {
  const store = inicializarStore();
  const evento = eventoFuturo("evt_cancel_1");
  store.guardarEvento(evento);

  const resReserva = store.reservar("evt_cancel_1", "usr_test_001");
  assert.equal(resReserva.reserva.estado, "confirmada");

  await conServidor(store, async (urlBase) => {
    const respuesta = await fetch(`${urlBase}/api/v1/events/evt_cancel_1/reservations`, {
      method: "DELETE",
      headers: { "X-User-Id": "usr_test_001" },
    });

    assert.equal(respuesta.status, 200);
    const cuerpo = (await respuesta.json()) as any;
    assert.equal(cuerpo.estado, "cancelada");
    assert.equal(cuerpo.eventoId, "evt_cancel_1");
    assert.equal(cuerpo.usuarioId, "usr_test_001");

    // Verificar directamente en SQLite que el registro quedó en 'cancelada'
    const reservaEnDb = store.obtenerReserva(cuerpo.id);
    assert.ok(reservaEnDb);
    assert.equal(reservaEnDb.estado, "cancelada");
  });
});

test("G3P-60: Validación de seguridad en el servidor impide la cancelación si el evento ya ha empezado", async () => {
  const store = inicializarStore();
  const evento = eventoPasado("evt_iniciado_1");
  store.guardarEvento(evento);

  // Insertar reserva previa directamente
  store.guardarReserva({
    id: "ins_iniciada_001",
    eventoId: "evt_iniciado_1",
    usuarioId: "usr_tardon_001",
    estado: "confirmada",
    creadaEn: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  });

  await conServidor(store, async (urlBase) => {
    const respuesta = await fetch(`${urlBase}/api/v1/events/evt_iniciado_1/reservations`, {
      method: "DELETE",
      headers: { "X-User-Id": "usr_tardon_001" },
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = (await respuesta.json()) as any;
    assert.match(cuerpo.mensaje, /ya ha comenzado/i);

    // Verificar en SQLite que NO se canceló
    const reservaEnDb = store.obtenerReserva("ins_iniciada_001");
    assert.ok(reservaEnDb);
    assert.equal(reservaEnDb.estado, "confirmada");
  });
});

test("G3P-60: Rechaza petición si falta la cabecera X-User-Id", async () => {
  const store = inicializarStore();
  const evento = eventoFuturo("evt_sin_cabecera");
  store.guardarEvento(evento);

  await conServidor(store, async (urlBase) => {
    const respuesta = await fetch(`${urlBase}/api/v1/events/evt_sin_cabecera/reservations`, {
      method: "DELETE",
    });

    assert.equal(respuesta.status, 400);
    const cuerpo = (await respuesta.json()) as any;
    assert.match(cuerpo.mensaje, /X-User-Id/i);
  });
});

test("G3P-60: Devuelve 404 si el usuario no tiene ninguna reserva activa en el evento", async () => {
  const store = inicializarStore();
  const evento = eventoFuturo("evt_no_inscrito");
  store.guardarEvento(evento);

  await conServidor(store, async (urlBase) => {
    const respuesta = await fetch(`${urlBase}/api/v1/events/evt_no_inscrito/reservations`, {
      method: "DELETE",
      headers: { "X-User-Id": "usr_sin_reserva" },
    });

    assert.equal(respuesta.status, 404);
  });
});

test("G3P-60: PATCH o DELETE a /api/v1/reservations/:id permite cancelar directamente por id de reserva", async () => {
  const store = inicializarStore();
  const evento = eventoFuturo("evt_directo");
  store.guardarEvento(evento);
  const { reserva } = store.reservar("evt_directo", "usr_directo_001");

  await conServidor(store, async (urlBase) => {
    const respuestaPatch = await fetch(`${urlBase}/api/v1/reservations/${reserva.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": "usr_directo_001",
      },
      body: JSON.stringify({ estado: "cancelada" }),
    });

    assert.equal(respuestaPatch.status, 200);
    const cuerpo = (await respuestaPatch.json()) as any;
    assert.equal(cuerpo.estado, "cancelada");

    const reservaEnDb = store.obtenerReserva(reserva.id);
    assert.equal(reservaEnDb?.estado, "cancelada");
  });
});
