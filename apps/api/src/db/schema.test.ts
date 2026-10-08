import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import type { CatalogoEventos, Evento } from "../domain/modelo.ts";
import { migrate, openDatabase } from "./migrate.ts";
import { SqliteEventStore } from "./sqlite-event-store.ts";

const catalogoPath = join(dirname(fileURLToPath(import.meta.url)), "../../../../data/eventos.json");

function baseDePrueba(): DatabaseSync {
  const db = openDatabase(":memory:");
  migrate(db);
  return db;
}

function insertarEventoMinimo(db: DatabaseSync, cambios: Record<string, string | number | null> = {}): void {
  const fila: Record<string, string | number | null> = {
    id: "evt_test",
    titulo: "Sesión de prueba",
    deporte: "yoga",
    nivel: "iniciacion",
    descripcion: "Descripción",
    inicio: "2026-10-18T10:00:00+02:00",
    fin: "2026-10-18T11:00:00+02:00",
    lugar_nombre: "Sala",
    lugar_punto_encuentro: "Hall",
    lugar_municipio: "Alcorcón",
    lugar_direccion: "Campus",
    lugar_lat: 40.34,
    lugar_lng: -3.82,
    capacidad: 8,
    plazas_libres: 3,
    material: '["Esterilla"]',
    estado: "abierta",
    organizador_id: "usr_mock_001",
    community_group_id: null,
    routine_id: null,
    ...cambios,
  };
  const columnas = Object.keys(fila);
  db.prepare(`INSERT INTO eventos (${columnas.join(", ")}) VALUES (${columnas.map(() => "?").join(", ")})`).run(
    ...columnas.map((columna) => fila[columna]),
  );
}

test("la migración crea eventos y reservas y no se vuelve a aplicar", () => {
  const db = baseDePrueba();
  const tablas = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('eventos', 'reservas') ORDER BY name")
    .all()
    .map((row) => String(row.name));
  assert.deepEqual(tablas, ["eventos", "reservas"]);

  const columnas = db.prepare("PRAGMA table_info(eventos)").all().map((row) => String(row.name));
  assert.ok(columnas.includes("capacidad"));
  assert.ok(columnas.includes("plazas_libres"));
  assert.ok(columnas.includes("estado"));

  const otraVez = migrate(db);
  assert.deepEqual(otraVez, []);
  db.close();
});

test("rechaza aforo imposible y estados fuera del vocabulario", () => {
  const db = baseDePrueba();
  assert.throws(() => insertarEventoMinimo(db, { plazas_libres: -1 }), /CHECK constraint failed/);
  assert.throws(() => insertarEventoMinimo(db, { plazas_libres: 9, capacidad: 8 }), /CHECK constraint failed/);
  assert.throws(() => insertarEventoMinimo(db, { capacidad: -1, plazas_libres: 0 }), /CHECK constraint failed/);
  assert.throws(() => insertarEventoMinimo(db, { estado: "Confirmada" }), /CHECK constraint failed/);
  assert.throws(() => insertarEventoMinimo(db, { id: "evento_1" }), /CHECK constraint failed/);
  db.close();
});

test("una reserva solo existe con evento real y estado del vocabulario", () => {
  const db = baseDePrueba();
  insertarEventoMinimo(db);
  assert.throws(
    () =>
      db
        .prepare("INSERT INTO reservas (id, evento_id, usuario_id, estado, creada_en) VALUES (?, ?, ?, ?, ?)")
        .run("ins_huerfana", "evt_ausente", "usr_mock_010", "confirmada", "2026-10-01T16:00:00+02:00"),
    /FOREIGN KEY constraint failed/,
  );
  assert.throws(
    () =>
      db
        .prepare("INSERT INTO reservas (id, evento_id, usuario_id, estado, creada_en) VALUES (?, ?, ?, ?, ?)")
        .run("ins_mala", "evt_test", "usr_mock_010", "Confirmada", "2026-10-01T16:00:00+02:00"),
    /CHECK constraint failed/,
  );

  db.prepare("INSERT INTO reservas (id, evento_id, usuario_id, estado, creada_en) VALUES (?, ?, ?, ?, ?)").run(
    "ins_ok",
    "evt_test",
    "usr_mock_010",
    "en_espera",
    "2026-10-01T16:00:00+02:00",
  );
  const guardada = db.prepare("SELECT estado FROM reservas WHERE id = ?").get("ins_ok") as { estado: string };
  assert.equal(guardada.estado, "en_espera");
  db.close();
});

test("el catálogo de semilla se guarda con capacidad y plazas_libres", () => {
  const catalogo = JSON.parse(readFileSync(catalogoPath, "utf8")) as CatalogoEventos;
  const db = baseDePrueba();
  const store = new SqliteEventStore(db);
  for (const evento of catalogo.eventos) {
    store.guardarEvento(evento);
  }

  const fila = db.prepare("SELECT capacidad, plazas_libres, estado FROM eventos WHERE id = ?").get("evt_001") as {
    capacidad: number;
    plazas_libres: number;
    estado: string;
  };
  assert.equal(fila.capacidad, 8);
  assert.equal(fila.plazas_libres, 3);
  assert.equal(fila.estado, "abierta");

  const leido = store.obtenerEvento("evt_001");
  assert.equal(leido?.aforoMaximo, 8);
  assert.equal(leido?.plazasDisponibles, 3);
  assert.equal(store.listarEventos().length, catalogo.eventos.length);

  const reserva = {
    id: "ins_001",
    eventoId: "evt_001",
    usuarioId: "usr_mock_010",
    estado: "confirmada" as const,
    creadaEn: "2026-10-01T16:00:00+02:00",
  };
  store.guardarReserva(reserva);
  assert.deepEqual(store.listarReservas("evt_001"), [reserva]);
  db.close();
});

test("la entidad rechaza plazas libres por encima de la capacidad antes de tocar la base", () => {
  const db = baseDePrueba();
  const store = new SqliteEventStore(db);
  const evento = {
    id: "evt_mal",
    titulo: "Mal aforo",
    deporte: "padel",
    nivel: "iniciacion",
    descripcion: "No debe guardarse",
    inicio: "2026-10-18T10:00:00+02:00",
    fin: "2026-10-18T11:00:00+02:00",
    lugar: {
      nombre: "Pista",
      puntoEncuentro: "Entrada",
      municipio: "Móstoles",
      direccion: "Campus",
      lat: 40.33,
      lng: -3.87,
    },
    aforoMaximo: 4,
    plazasDisponibles: 5,
    material: [],
    estado: "abierta",
    organizadorId: "usr_mock_001",
    communityGroupId: null,
    routineId: null,
  } satisfies Evento;
  assert.throws(() => store.guardarEvento(evento), /no pueden superar la capacidad/);
  assert.equal(store.obtenerEvento("evt_mal"), undefined);
  db.close();
});
