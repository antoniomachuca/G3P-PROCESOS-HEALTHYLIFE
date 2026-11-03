import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";
import type { Evento } from "../domain/modelo.ts";

function crearEvento(id: string, inicio: string, fin: string, titulo: string): Evento {
  return {
    id,
    titulo,
    deporte: "running",
    nivel: "intermedio",
    descripcion: "Entrenamiento",
    inicio,
    fin,
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
}

function almacenEnMemoria(): SqliteEventStore {
  const db = openDatabase(":memory:");
  migrate(db);
  const store = new SqliteEventStore(db);
  store.guardarEvento(crearEvento("evt_lejano", "2028-11-20T10:00:00+01:00", "2028-11-20T11:00:00+01:00", "Lejano"));
  store.guardarEvento(crearEvento("evt_cercano", "2028-10-20T10:00:00+02:00", "2028-10-20T11:00:00+02:00", "Cercano"));
  store.guardarEvento(crearEvento("evt_otro", "2028-10-25T10:00:00+02:00", "2028-10-25T11:00:00+02:00", "De otro usuario"));
  // Evento ya terminado: reservar() lo rechazaría, así que la reserva se inserta directamente.
  store.guardarEvento(crearEvento("evt_pasado", "2020-01-10T10:00:00+01:00", "2020-01-10T11:00:00+01:00", "Pasado"));
  store.guardarReserva({
    id: "ins_pasada",
    eventoId: "evt_pasado",
    usuarioId: "usr_panel",
    estado: "confirmada",
    creadaEn: "2019-12-01T10:00:00+01:00",
  });
  return store;
}

async function conServidor(store: SqliteEventStore, fn: (url: string) => Promise<void>): Promise<void> {
  const server: Server = createServer((req, res) => manejarReservas(store, req, res));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("HU-17: GET /api/v1/me/events devuelve solo mis reservas confirmadas futuras, ordenadas por inicio", async () => {
  const store = almacenEnMemoria();
  store.reservar("evt_lejano", "usr_panel");
  store.reservar("evt_cercano", "usr_panel");
  store.reservar("evt_otro", "usr_otro");

  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/me/events`, { headers: { "X-User-Id": "usr_panel" } });
    assert.equal(res.status, 200);
    const datos = (await res.json()) as { eventos: Evento[] };
    assert.deepEqual(datos.eventos.map((e) => e.id), ["evt_cercano", "evt_lejano"]);
    // Misma forma que el catálogo: la ficha puede abrirse sin otra llamada (punto de encuentro incluido).
    assert.equal(datos.eventos[0].lugar.puntoEncuentro, "Entrada principal");
  });
});

test("HU-17: una actividad cuyo fin ya pasó no aparece aunque la reserva siga confirmada", async () => {
  const store = almacenEnMemoria();
  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/me/events`, { headers: { "X-User-Id": "usr_panel" } });
    const datos = (await res.json()) as { eventos: Evento[] };
    assert.deepEqual(datos.eventos, []);
  });
});

test("HU-17: no cuenta las reservas en lista de espera ni las canceladas", async () => {
  const store = almacenEnMemoria();
  store.reservar("evt_cercano", "usr_panel");
  store.cancelarReserva("evt_cercano", "usr_panel");

  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/me/events`, { headers: { "X-User-Id": "usr_panel" } });
    const datos = (await res.json()) as { eventos: Evento[] };
    assert.deepEqual(datos.eventos, []);
  });
});

test("HU-17: sin cabecera X-User-Id responde 400", async () => {
  await conServidor(almacenEnMemoria(), async (base) => {
    const res = await fetch(`${base}/api/v1/me/events`);
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { mensaje: "Falta la cabecera X-User-Id" });
  });
});
