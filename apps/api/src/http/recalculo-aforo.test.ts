import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import type { Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

function crearEventoFuturo(id: string, aforoMaximo: number, plazasDisponibles: number): Evento {
  return {
    id,
    titulo: "Evento para prueba de aforo",
    deporte: "natacion",
    nivel: "intermedio",
    descripcion: "Prueba de recálculo de aforo",
    inicio: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    fin: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
    lugar: {
      nombre: "Piscina URJC",
      puntoEncuentro: "Vestuarios",
      municipio: "Alcorcón",
      direccion: "Campus Alcorcón",
      lat: 40.34,
      lng: -3.83,
    },
    aforoMaximo,
    plazasDisponibles,
    material: ["Gorro", "Bañador"],
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

test("G3P-61: Cancelar reserva confirmada incrementa en +1 las plazas disponibles en base de datos", async () => {
  const store = inicializarStore();
  const evento = crearEventoFuturo("evt_aforo_1", 5, 2);
  store.guardarEvento(evento);

  // Crear reserva confirmada (había 2 plazas, pasa a 1)
  const resReserva = store.reservar("evt_aforo_1", "usr_participante_1");
  assert.equal(resReserva.reserva.estado, "confirmada");
  assert.equal(resReserva.plazasDisponibles, 1);

  // Estado previo del evento
  const eventoAntes = store.obtenerEvento("evt_aforo_1");
  assert.equal(eventoAntes?.plazasDisponibles, 1);

  // Cancelar la reserva
  const resCancel = store.cancelarReserva("evt_aforo_1", "usr_participante_1");
  assert.equal(resCancel.reserva.estado, "cancelada");
  assert.equal(resCancel.plazasDisponibles, 2);

  // Verificar que la base de datos se actualizó a +1
  const eventoDespues = store.obtenerEvento("evt_aforo_1");
  assert.equal(eventoDespues?.plazasDisponibles, 2);
});

test("G3P-61: Cancelar en evento completo (0 plazas) libera vacante (+1) y permite nueva reserva", async () => {
  const store = inicializarStore();
  // Evento con capacidad 1 y 1 plaza libre
  const evento = crearEventoFuturo("evt_aforo_cero", 1, 1);
  store.guardarEvento(evento);

  // Usuario 1 reserva la única plaza disponible (queda a 0)
  const res1 = store.reservar("evt_aforo_cero", "usr_primero");
  assert.equal(res1.reserva.estado, "confirmada");
  assert.equal(store.obtenerEvento("evt_aforo_cero")?.plazasDisponibles, 0);

  // Usuario 2 intenta reservar y queda en espera
  const res2 = store.reservar("evt_aforo_cero", "usr_segundo");
  assert.equal(res2.reserva.estado, "en_espera");
  assert.equal(store.obtenerEvento("evt_aforo_cero")?.plazasDisponibles, 0);

  // Usuario 1 cancela su plaza confirmada
  const resCancel = store.cancelarReserva("evt_aforo_cero", "usr_primero");
  assert.equal(resCancel.reserva.estado, "cancelada");
  assert.equal(resCancel.plazasDisponibles, 1);

  // El evento ahora tiene 1 plaza libre
  assert.equal(store.obtenerEvento("evt_aforo_cero")?.plazasDisponibles, 1);

  // Un tercer usuario ahora puede reservar la plaza liberada
  const res3 = store.reservar("evt_aforo_cero", "usr_tercero");
  assert.equal(res3.reserva.estado, "confirmada");
  assert.equal(store.obtenerEvento("evt_aforo_cero")?.plazasDisponibles, 0);
});

test("G3P-61: Cancelar una reserva en lista de espera (en_espera) NO altera las plazas disponibles", async () => {
  const store = inicializarStore();
  const evento = crearEventoFuturo("evt_aforo_espera", 1, 0); // 0 plazas disponibles
  store.guardarEvento(evento);

  // Insertar reserva en_espera
  store.guardarReserva({
    id: "ins_espera_001",
    eventoId: "evt_aforo_espera",
    usuarioId: "usr_en_espera",
    estado: "en_espera",
    creadaEn: new Date().toISOString(),
  });

  const plazasAntes = store.obtenerEvento("evt_aforo_espera")?.plazasDisponibles;
  assert.equal(plazasAntes, 0);

  // Cancelar la reserva en espera
  const cancelacion = store.cancelarReserva("evt_aforo_espera", "usr_en_espera");
  assert.equal(cancelacion.reserva.estado, "cancelada");
  assert.equal(cancelacion.plazasDisponibles, 0);

  // Las plazas disponibles deben seguir siendo 0
  const plazasDespues = store.obtenerEvento("evt_aforo_espera")?.plazasDisponibles;
  assert.equal(plazasDespues, 0);
});

test("G3P-61: Las plazas disponibles nunca superan el aforo máximo (capacidad)", async () => {
  const store = inicializarStore();
  const evento = crearEventoFuturo("evt_max_cap", 2, 2); // Ya al máximo
  store.guardarEvento(evento);

  // Simular reserva confirmada insertada directamente
  store.guardarReserva({
    id: "ins_desfasada",
    eventoId: "evt_max_cap",
    usuarioId: "usr_desfasado",
    estado: "confirmada",
    creadaEn: new Date().toISOString(),
  });

  const resCancel = store.cancelarReserva("evt_max_cap", "usr_desfasado");
  assert.equal(resCancel.plazasDisponibles, 2);

  const eventoActual = store.obtenerEvento("evt_max_cap");
  assert.equal(eventoActual?.plazasDisponibles, 2);
  assert.equal(eventoActual?.plazasDisponibles, eventoActual?.aforoMaximo);
});

test("G3P-61: Integración HTTP DELETE - Devuelve contador actualizado tras anulación", async () => {
  const store = inicializarStore();
  const evento = crearEventoFuturo("evt_http_aforo", 10, 5);
  store.guardarEvento(evento);
  store.reservar("evt_http_aforo", "usr_http_1");

  assert.equal(store.obtenerEvento("evt_http_aforo")?.plazasDisponibles, 4);

  await conServidor(store, async (urlBase) => {
    const respuesta = await fetch(`${urlBase}/api/v1/events/evt_http_aforo/reservations`, {
      method: "DELETE",
      headers: { "X-User-Id": "usr_http_1" },
    });

    assert.equal(respuesta.status, 200);
    const cuerpo = (await respuesta.json()) as any;
    assert.equal(cuerpo.estado, "cancelada");
    assert.equal(cuerpo.plazasDisponibles, 5);

    // Comprobar mediante GET catálogo que el aforo se refleja actualizado
    const respCatalogo = await fetch(`${urlBase}/api/v1/events`);
    const catalogo = (await respCatalogo.json()) as any;
    const ev = catalogo.eventos.find((e: any) => e.id === "evt_http_aforo");
    assert.equal(ev.plazasDisponibles, 5);
  });
});
