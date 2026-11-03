import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "../db/migrate.ts";
import { SqliteEventStore } from "../db/sqlite-event-store.ts";
import { manejarReservas } from "./reservas.ts";

// HU-08 / G3P-56: PATCH /api/v1/events/{id}

function eventoDePrueba(cambios: Partial<Evento> = {}): Evento {
  return {
    id: "evt_edicion",
    titulo: "Yoga al aire libre",
    deporte: "yoga",
    nivel: "intermedio",
    descripcion: "Sesión de estiramientos",
    inicio: "2030-11-20T18:00:00+01:00",
    fin: "2030-11-20T19:30:00+01:00",
    lugar: {
      nombre: "Jardín central",
      puntoEncuentro: "Fuente del jardín",
      municipio: "Fuenlabrada",
      direccion: "Campus de Fuenlabrada",
      lat: 40.28,
      lng: -3.81,
    },
    aforoMaximo: 5,
    plazasDisponibles: 5,
    material: ["Esterilla"],
    estado: "abierta",
    organizadorId: "usr_mock_001",
    communityGroupId: null,
    routineId: null,
    ...cambios,
  };
}

/** Evento con `inscritos` reservas confirmadas de verdad, hechas por el camino público. */
function almacenConInscritos(inscritos: number, ruta = ":memory:"): SqliteEventStore {
  const db = openDatabase(ruta);
  migrate(db);
  const store = new SqliteEventStore(db);
  store.guardarEvento(eventoDePrueba());
  for (let i = 1; i <= inscritos; i++) {
    assert.equal(store.reservar("evt_edicion", `usr_mock_10${i}`).reserva.estado, "confirmada");
  }
  return store;
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

const ORGANIZADOR = "usr_mock_001";

function patch(base: string, cuerpo: unknown, id = "evt_edicion", usuarioId: string | null = ORGANIZADOR): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (usuarioId !== null) headers["X-User-Id"] = usuarioId;
  return fetch(`${base}/api/v1/events/${id}`, {
    method: "PATCH",
    headers,
    body: typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo),
  });
}

test("actualiza los campos libres y los deja guardados en SQLite", async () => {
  const store = almacenConInscritos(0);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, {
      titulo: "Yoga al atardecer",
      descripcion: "Estiramientos y respiración",
      nivel: "iniciacion",
      lugar: { puntoEncuentro: "Puerta norte del jardín" },
      material: [" Esterilla ", "Agua", ""],
    });
    assert.equal(respuesta.status, 200);
    const devuelto = (await respuesta.json()) as Evento;
    assert.equal(devuelto.titulo, "Yoga al atardecer");
    assert.deepEqual(devuelto.material, ["Esterilla", "Agua"]);
  });

  const guardado = store.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.titulo, "Yoga al atardecer");
  assert.equal(guardado.descripcion, "Estiramientos y respiración");
  assert.equal(guardado.nivel, "iniciacion");
  assert.equal(guardado.lugar.puntoEncuentro, "Puerta norte del jardín");
  assert.equal(guardado.lugar.nombre, "Jardín central");
  assert.deepEqual(guardado.material, ["Esterilla", "Agua"]);
});

test("los campos que no llegan en la petición no cambian", async () => {
  const store = almacenConInscritos(1);
  await conServidor(store, async (base) => {
    assert.equal((await patch(base, { titulo: "Solo el título" })).status, 200);
  });
  const guardado = store.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.titulo, "Solo el título");
  assert.equal(guardado.descripcion, "Sesión de estiramientos");
  assert.equal(guardado.inicio, "2030-11-20T18:00:00+01:00");
  assert.equal(guardado.aforoMaximo, 5);
  assert.equal(guardado.plazasDisponibles, 4);
});

test("reducir el aforo por debajo de los inscritos responde 409 y no toca la base", async () => {
  const store = almacenConInscritos(3);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { aforoMaximo: 2, titulo: "No debería guardarse" });
    assert.equal(respuesta.status, 409);
    const { mensaje } = (await respuesta.json()) as { mensaje: string };
    assert.equal(mensaje, "La capacidad no puede ser menor al número de usuarios ya inscritos (3)");
  });
  const guardado = store.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.aforoMaximo, 5);
  assert.equal(guardado.plazasDisponibles, 2);
  assert.equal(guardado.titulo, "Yoga al aire libre");
});

test("reducir el aforo justo hasta los inscritos se acepta y deja cero plazas libres", async () => {
  const store = almacenConInscritos(3);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { aforoMaximo: 3 });
    assert.equal(respuesta.status, 200);
    const devuelto = (await respuesta.json()) as Evento;
    assert.equal(devuelto.aforoMaximo, 3);
    assert.equal(devuelto.plazasDisponibles, 0);
  });
});

test("ampliar el aforo suma las plazas nuevas a las libres sin perder las ocupadas", async () => {
  const store = almacenConInscritos(3);
  await conServidor(store, async (base) => {
    assert.equal((await patch(base, { aforoMaximo: 10 })).status, 200);
  });
  const guardado = store.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.aforoMaximo, 10);
  assert.equal(guardado.plazasDisponibles, 7);
});

test("un inicio en el pasado se rechaza y la fecha guardada no cambia", async () => {
  const store = almacenConInscritos(0);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { inicio: "2020-01-01T10:00:00+01:00", fin: "2020-01-01T11:00:00+01:00" });
    assert.equal(respuesta.status, 400);
    assert.deepEqual(await respuesta.json(), { mensaje: "La nueva fecha de inicio debe ser futura" });
  });
  assert.equal(store.obtenerEvento("evt_edicion")!.inicio, "2030-11-20T18:00:00+01:00");
});

test("una nueva fecha futura válida se guarda con su offset", async () => {
  const store = almacenConInscritos(0);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { inicio: "2030-06-01T09:00:00+02:00", fin: "2030-06-01T10:00:00+02:00" });
    assert.equal(respuesta.status, 200);
  });
  const guardado = store.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.inicio, "2030-06-01T09:00:00+02:00");
  assert.equal(guardado.fin, "2030-06-01T10:00:00+02:00");
});

test("un fin anterior o igual al inicio se rechaza", async () => {
  await conServidor(almacenConInscritos(0), async (base) => {
    const respuesta = await patch(base, { fin: "2030-11-20T17:00:00+01:00" });
    assert.equal(respuesta.status, 400);
    assert.deepEqual(await respuesta.json(), { mensaje: "La hora de fin debe ser posterior a la de inicio" });
  });
});

test("deporte, lugar, plazas y demás campos bloqueados no se pueden modificar", async () => {
  const store = almacenConInscritos(1);
  await conServidor(store, async (base) => {
    for (const [cuerpo, campo] of [
      [{ deporte: "futbol" }, "deporte"],
      [{ lugar: { nombre: "Otro campus" } }, "lugar.nombre"],
      [{ lugar: { municipio: "Móstoles" } }, "lugar.municipio"],
      [{ plazasDisponibles: 5 }, "plazasDisponibles"],
      [{ estado: "cancelada" }, "estado"],
      [{ organizadorId: "usr_mock_999" }, "organizadorId"],
      [{ id: "evt_otro" }, "id"],
    ] as const) {
      const respuesta = await patch(base, cuerpo);
      assert.equal(respuesta.status, 400, campo);
      assert.deepEqual(await respuesta.json(), { mensaje: `El campo ${campo} no se puede modificar` });
    }
  });
  const guardado = store.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.deporte, "yoga");
  assert.equal(guardado.lugar.nombre, "Jardín central");
  assert.equal(guardado.plazasDisponibles, 4);
  assert.equal(guardado.estado, "abierta");
});

test("datos con formato incorrecto responden 400 en español", async () => {
  await conServidor(almacenConInscritos(0), async (base) => {
    const casos: Array<[unknown, string]> = [
      ["{no es json", "El cuerpo de la petición no es JSON válido"],
      [[1, 2], "El cuerpo de la petición debe ser un objeto JSON"],
      [{ titulo: "   " }, "El campo titulo no puede estar vacío"],
      [{ nivel: "experto" }, "El nivel debe ser uno de: iniciacion, intermedio, competicion"],
      [{ aforoMaximo: 0 }, "La capacidad debe ser un número entero mayor que cero"],
      [{ aforoMaximo: "8" }, "La capacidad debe ser un número entero mayor que cero"],
      [{ aforoMaximo: 7.5 }, "La capacidad debe ser un número entero mayor que cero"],
      [{ material: "Esterilla" }, "El material debe ser una lista de textos"],
      [{ inicio: "2030-12-01 10:00" }, "El campo inicio debe ser una fecha ISO-8601 con zona horaria"],
    ];
    for (const [cuerpo, mensaje] of casos) {
      const respuesta = await patch(base, cuerpo);
      assert.equal(respuesta.status, 400, mensaje);
      assert.deepEqual(await respuesta.json(), { mensaje });
    }
  });
});

test("editar un evento inexistente responde 404", async () => {
  await conServidor(almacenConInscritos(0), async (base) => {
    const respuesta = await patch(base, { titulo: "Nada" }, "evt_no_existe");
    assert.equal(respuesta.status, 404);
    assert.deepEqual(await respuesta.json(), { mensaje: "Evento no encontrado" });
  });
});

test("la reducción de aforo ve las plazas que otra conexión acaba de confirmar", () => {
  // Dos conexiones al mismo fichero, una detrás de otra (no es una carrera): la reducción lee
  // el aforo dentro de su transacción y no un valor cacheado. Que no se puedan solapar lo garantiza
  // BEGIN IMMEDIATE, igual que en reservar().
  const ruta = join(mkdtempSync(join(tmpdir(), "e3-edicion-")), "e3.sqlite");
  const organizador = almacenConInscritos(2, ruta);
  const otraConexion = openDatabase(ruta);
  const participante = new SqliteEventStore(otraConexion);

  assert.equal(participante.reservar("evt_edicion", "usr_mock_200").reserva.estado, "confirmada");
  assert.throws(
    () => organizador.actualizarEvento("evt_edicion", { aforoMaximo: 2 }, ORGANIZADOR),
    /La capacidad no puede ser menor al número de usuarios ya inscritos \(3\)/,
  );

  const guardado = organizador.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.aforoMaximo, 5);
  assert.equal(guardado.plazasDisponibles, 2);
});

// G3P-57: control de permisos de organizador

test("sin cabecera X-User-Id la edición responde 401 y no toca la base", async () => {
  const store = almacenConInscritos(0);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { titulo: "Intruso" }, "evt_edicion", null);
    assert.equal(respuesta.status, 401);
    assert.deepEqual(await respuesta.json(), { mensaje: "Falta la cabecera X-User-Id" });
  });
  assert.equal(store.obtenerEvento("evt_edicion")!.titulo, "Yoga al aire libre");
});

test("un usuario que no es el organizador recibe 403 y el evento no cambia", async () => {
  const store = almacenConInscritos(2);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { titulo: "Intruso", aforoMaximo: 20 }, "evt_edicion", "usr_mock_101");
    assert.equal(respuesta.status, 403);
    assert.deepEqual(await respuesta.json(), { mensaje: "Solo el organizador del evento puede editarlo" });
  });
  const guardado = store.obtenerEvento("evt_edicion")!;
  assert.equal(guardado.titulo, "Yoga al aire libre");
  assert.equal(guardado.aforoMaximo, 5);
  assert.equal(guardado.plazasDisponibles, 3);
});

test("el permiso se comprueba antes que los datos: un no organizador no descubre errores de validación", async () => {
  const store = almacenConInscritos(0);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { deporte: "futbol" }, "evt_edicion", "usr_mock_999");
    assert.equal(respuesta.status, 403);
  });
});

test("el organizador sí puede editar su evento", async () => {
  const store = almacenConInscritos(0);
  await conServidor(store, async (base) => {
    const respuesta = await patch(base, { titulo: "Yoga del organizador" }, "evt_edicion", ORGANIZADOR);
    assert.equal(respuesta.status, 200);
    assert.equal(((await respuesta.json()) as Evento).titulo, "Yoga del organizador");
  });
});

test("el almacén también rechaza al no organizador fuera de HTTP", () => {
  const store = almacenConInscritos(0);
  assert.throws(() => store.actualizarEvento("evt_edicion", { titulo: "x" }, "usr_mock_002"), /Solo el organizador/);
  assert.throws(() => store.actualizarEvento("evt_edicion", { titulo: "x" }, "  "), /Falta la cabecera X-User-Id/);
  assert.equal(store.obtenerEvento("evt_edicion")!.titulo, "Yoga al aire libre");
});
