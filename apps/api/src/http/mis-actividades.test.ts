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
  store.guardarEvento(crearEvento("evt_pasado_reciente", "2021-01-10T10:00:00+01:00", "2021-01-10T11:00:00+01:00", "Pasado reciente"));
  store.guardarEvento(crearEvento("evt_pasado_espera", "2019-01-10T10:00:00+01:00", "2019-01-10T11:00:00+01:00", "En espera"));
  store.guardarEvento(crearEvento("evt_pasado_cancelado", "2022-01-10T10:00:00+01:00", "2022-01-10T11:00:00+01:00", "Reserva cancelada"));
  store.guardarEvento(crearEvento("evt_pasado_no_presentado", "2023-01-10T10:00:00+01:00", "2023-01-10T11:00:00+01:00", "No presentado"));
  store.guardarEvento(crearEvento("evt_pasado_otro", "2024-01-10T10:00:00+01:00", "2024-01-10T11:00:00+01:00", "De otro usuario"));
  // Evento ya terminado: reservar() lo rechazaría, así que la reserva se inserta directamente.
  store.guardarEvento(crearEvento("evt_pasado", "2020-01-10T10:00:00+01:00", "2020-01-10T11:00:00+01:00", "Pasado"));
  store.guardarReserva({
    id: "ins_pasada",
    eventoId: "evt_pasado",
    usuarioId: "usr_panel",
    estado: "confirmada",
    creadaEn: "2019-12-01T10:00:00+01:00",
  });
  store.guardarReserva({
    id: "ins_pasada_asistida",
    eventoId: "evt_pasado_reciente",
    usuarioId: "usr_panel",
    estado: "asistida",
    creadaEn: "2020-12-01T10:00:00+01:00",
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

test("HU-21: GET /api/v1/me/events/history devuelve solo actividades pasadas propias ordenadas de más reciente a más antigua", async () => {
  const store = almacenEnMemoria();
  const reservasNoHistoricas = [
    ["ins_espera_pasada", "evt_pasado_espera", "usr_panel", "en_espera"],
    ["ins_cancelada_pasada", "evt_pasado_cancelado", "usr_panel", "cancelada"],
    ["ins_no_presentado", "evt_pasado_no_presentado", "usr_panel", "no_presentado"],
    ["ins_pasada_otro_usuario", "evt_pasado_otro", "usr_otro", "confirmada"],
    ["ins_futura_confirmada", "evt_cercano", "usr_panel", "confirmada"],
  ] as const;
  for (const [id, eventoId, usuarioId, estado] of reservasNoHistoricas) {
    store.guardarReserva({ id, eventoId, usuarioId, estado, creadaEn: "2019-12-01T10:00:00+01:00" });
  }

  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/me/events/history`, { headers: { "X-User-Id": "usr_panel" } });
    assert.equal(res.status, 200);
    const datos = (await res.json()) as { eventos: Evento[] };
    assert.deepEqual(datos.eventos.map((e) => e.id), ["evt_pasado_reciente", "evt_pasado"]);
  });
});

test("HU-21: un usuario sin actividades concluidas obtiene una lista vacía y sin cabecera recibe 400", async () => {
  await conServidor(almacenEnMemoria(), async (base) => {
    const sinRegistros = await fetch(`${base}/api/v1/me/events/history`, { headers: { "X-User-Id": "usr_nuevo" } });
    assert.equal(sinRegistros.status, 200);
    assert.deepEqual(await sinRegistros.json(), { eventos: [] });

    const sinUsuario = await fetch(`${base}/api/v1/me/events/history`);
    assert.equal(sinUsuario.status, 400);
    assert.deepEqual(await sinUsuario.json(), { mensaje: "Falta la cabecera X-User-Id" });
  });
});
