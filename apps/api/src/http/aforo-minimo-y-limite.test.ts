import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import type { Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

// HU-11 / G3P-97: campos de aforo mínimo y fecha límite de inscripción en modelo y API.

function crearAlmacen(): SqliteEventStore {
  const db = openDatabase(":memory:");
  migrate(db);
  return new SqliteEventStore(db);
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

function payloadBase(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    titulo: "Partido de fútbol sala",
    deporte: "futbol",
    nivel: "intermedio",
    descripcion: "Partido amistoso 5 vs 5",
    inicio: "2099-05-10T19:30:00+02:00",
    fin: "2099-05-10T21:00:00+02:00",
    lugar: {
      nombre: "Pabellón cubierto",
      puntoEncuentro: "Puerta principal",
      municipio: "Vicálvaro",
      direccion: "Campus de Vicálvaro",
      lat: 40.4058,
      lng: -3.6083,
    },
    aforoMaximo: 14,
    aforoMinimo: 10,
    fechaLimiteInscripcion: "2099-05-10T18:00:00+02:00",
    material: ["Botas de fútbol sala"],
    organizadorId: "usr_mock_010",
    communityGroupId: null,
    routineId: null,
    ...cambios,
  };
}

test("G3P-97: POST /api/v1/events persiste aforoMinimo y fechaLimiteInscripcion y GET los devuelve", async () => {
  const store = crearAlmacen();
  await conServidor(store, async (base) => {
    const res = await fetch(`${base}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadBase()),
    });
    assert.equal(res.status, 201);
    const creado = (await res.json()) as Evento;
    assert.equal(creado.aforoMinimo, 10);
    assert.equal(creado.fechaLimiteInscripcion, "2099-05-10T18:00:00+02:00");

    const resGet = await fetch(`${base}/api/v1/events/${creado.id}`);
    assert.equal(resGet.status, 200);
    const leido = (await resGet.json()) as Evento;
    assert.equal(leido.aforoMinimo, 10);
    assert.equal(leido.fechaLimiteInscripcion, "2099-05-10T18:00:00+02:00");
  });
});

test("G3P-97: POST /api/v1/events sin aforoMinimo ni fechaLimiteInscripcion los guarda como null", async () => {
  const store = crearAlmacen();
  await conServidor(store, async (base) => {
    const payload = payloadBase();
    delete payload.aforoMinimo;
    delete payload.fechaLimiteInscripcion;
    const res = await fetch(`${base}/api/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    assert.equal(res.status, 201);
    const creado = (await res.json()) as Evento;
    assert.equal(creado.aforoMinimo, null);
    assert.equal(creado.fechaLimiteInscripcion, null);
    assert.equal(store.obtenerEvento(creado.id)?.aforoMinimo, null);
    assert.equal(store.obtenerEvento(creado.id)?.fechaLimiteInscripcion, null);
  });
});

test("G3P-97: POST /api/v1/events rechaza aforoMinimo y fechaLimiteInscripcion inválidos", async () => {
  const store = crearAlmacen();
  await conServidor(store, async (base) => {
    const casos: Array<[Record<string, unknown>, string]> = [
      [{ aforoMinimo: 0 }, "El aforo mínimo debe ser un número entero mayor que cero"],
      [{ aforoMinimo: 15, aforoMaximo: 14 }, "El aforo mínimo no puede superar el aforo máximo"],
      [{ fechaLimiteInscripcion: "2099-05-10 18:00" }, "La fecha límite de inscripción debe ser una fecha ISO-8601 con zona horaria"],
      [{ fechaLimiteInscripcion: "2099-05-10T19:30:00+02:00" }, "La fecha límite de inscripción debe ser anterior al inicio del evento"],
      [{ fechaLimiteInscripcion: "2099-05-10T20:00:00+02:00" }, "La fecha límite de inscripción debe ser anterior al inicio del evento"],
      [{ fechaLimiteInscripcion: "2020-01-01T10:00:00+01:00" }, "La fecha límite de inscripción debe ser futura"],
    ];

    for (const [cambios, mensajeEsperado] of casos) {
      const res = await fetch(`${base}/api/v1/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBase(cambios)),
      });
      assert.equal(res.status, 400, mensajeEsperado);
      assert.deepEqual(await res.json(), { mensaje: mensajeEsperado });
    }
  });
});

test("G3P-97: PATCH /api/v1/events/{id} actualiza, valida y permite limpiar aforoMinimo y fechaLimiteInscripcion", async () => {
  const store = crearAlmacen();
  await conServidor(store, async (base) => {
    const creado = (await (
      await fetch(`${base}/api/v1/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBase()),
      })
    ).json()) as Evento;

    const patch = (cuerpo: unknown) =>
      fetch(`${base}/api/v1/events/${creado.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-User-Id": "usr_mock_010" },
        body: JSON.stringify(cuerpo),
      });

    // Actualizar ambos valores
    const resOk = await patch({ aforoMinimo: 8, fechaLimiteInscripcion: "2099-05-10T17:00:00+02:00" });
    assert.equal(resOk.status, 200);
    const actualizado = (await resOk.json()) as Evento;
    assert.equal(actualizado.aforoMinimo, 8);
    assert.equal(actualizado.fechaLimiteInscripcion, "2099-05-10T17:00:00+02:00");

    // Bajar aforoMaximo por debajo del aforoMinimo guardado se rechaza
    const resAforoIncoherente = await patch({ aforoMaximo: 6 });
    assert.equal(resAforoIncoherente.status, 400);
    assert.deepEqual(await resAforoIncoherente.json(), {
      mensaje: "El aforo mínimo no puede superar el aforo máximo",
    });

    // Fecha límite posterior al inicio se rechaza
    const resLimiteTarde = await patch({ fechaLimiteInscripcion: "2099-05-10T19:45:00+02:00" });
    assert.equal(resLimiteTarde.status, 400);
    assert.deepEqual(await resLimiteTarde.json(), {
      mensaje: "La fecha límite de inscripción debe ser anterior al inicio del evento",
    });

    // Limpiar ambos con null
    const resLimpiar = await patch({ aforoMinimo: null, fechaLimiteInscripcion: null });
    assert.equal(resLimpiar.status, 200);
    const limpio = (await resLimpiar.json()) as Evento;
    assert.equal(limpio.aforoMinimo, null);
    assert.equal(limpio.fechaLimiteInscripcion, null);
  });
});

// HU-11 / G3P-98: cierre automático al superar la hora límite (sin inscripciones ni cancelaciones directas).

test("G3P-98: superada la hora límite de inscripción, rechaza nuevas reservas y cancelaciones directas en API y SQLite", async () => {
  const store = crearAlmacen();
  const eventoCerrado: Evento = {
    id: "evt_limite_pasado",
    titulo: "Fútbol sala cerrado por límite",
    deporte: "futbol",
    nivel: "intermedio",
    descripcion: "El partido aún no empezó pero cerró su plazo de inscripción",
    inicio: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    fin: new Date(Date.now() + 3 * 3_600_000).toISOString(),
    lugar: {
      nombre: "Pabellón cubierto",
      puntoEncuentro: "Puerta principal",
      municipio: "Vicálvaro",
      direccion: "Campus de Vicálvaro",
      lat: 40.4058,
      lng: -3.6083,
    },
    aforoMaximo: 14,
    plazasDisponibles: 4,
    aforoMinimo: 10,
    fechaLimiteInscripcion: new Date(Date.now() - 10 * 60_000).toISOString(),
    material: ["Botas"],
    estado: "abierta",
    organizadorId: "usr_mock_010",
    communityGroupId: null,
    routineId: null,
  };
  store.guardarEvento(eventoCerrado);
  store.guardarReserva({
    id: "ins_previa_001",
    eventoId: eventoCerrado.id,
    usuarioId: "usr_mock_020",
    estado: "confirmada",
    creadaEn: new Date(Date.now() - 60 * 60_000).toISOString(),
  });

  await conServidor(store, async (base) => {
    // Intento de nueva inscripción tras superar el límite
    const resReserva = await fetch(`${base}/api/v1/events/${eventoCerrado.id}/reservations`, {
      method: "POST",
      headers: { "X-User-Id": "usr_mock_030" },
    });
    assert.equal(resReserva.status, 400);
    assert.deepEqual(await resReserva.json(), {
      mensaje: "El plazo de inscripción ha finalizado y el evento está cerrado",
    });

    // Intento de cancelación directa por evento tras superar el límite
    const resCancelEvento = await fetch(`${base}/api/v1/events/${eventoCerrado.id}/reservations`, {
      method: "DELETE",
      headers: { "X-User-Id": "usr_mock_020" },
    });
    assert.equal(resCancelEvento.status, 400);
    assert.deepEqual(await resCancelEvento.json(), {
      mensaje: "El plazo límite de inscripción ha pasado; no se permiten cancelaciones directas",
    });

    // Intento de cancelación directa por id de reserva tras superar el límite
    const resCancelId = await fetch(`${base}/api/v1/reservations/ins_previa_001`, {
      method: "DELETE",
      headers: { "X-User-Id": "usr_mock_020" },
    });
    assert.equal(resCancelId.status, 400);
    assert.deepEqual(await resCancelId.json(), {
      mensaje: "El plazo límite de inscripción ha pasado; no se permiten cancelaciones directas",
    });
  });

  // La base de datos permanece intacta
  assert.equal(store.obtenerEvento(eventoCerrado.id)?.plazasDisponibles, 4);
  assert.equal(store.obtenerReserva("ins_previa_001")?.estado, "confirmada");
  assert.equal(store.listarReservas(eventoCerrado.id).length, 1);
});
