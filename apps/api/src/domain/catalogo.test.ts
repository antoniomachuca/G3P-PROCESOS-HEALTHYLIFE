import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { eventosActivos } from "./catalogo.ts";
import { DEPORTES, type CatalogoEventos, type Evento } from "./modelo.ts";

const semilla = JSON.parse(
  readFileSync(new URL("../../../../data/eventos.json", import.meta.url), "utf8"),
) as CatalogoEventos;

const ahora = new Date("2026-10-08T12:00:00+02:00");

function evento(id: string, inicio: string, fin: string, estado: Evento["estado"] = "abierta"): Evento {
  return { ...semilla.eventos[0], id, inicio, fin, estado };
}

test("no muestra eventos finalizados", () => {
  const finalizado = evento("evt_fin", "2026-10-20T10:00:00+02:00", "2026-10-20T11:00:00+02:00", "finalizada");
  assert.deepEqual(eventosActivos([finalizado], ahora), []);
});

test("no muestra eventos cancelados", () => {
  const cancelado = evento("evt_canc", "2026-10-20T10:00:00+02:00", "2026-10-20T11:00:00+02:00", "cancelada");
  assert.deepEqual(eventosActivos([cancelado], ahora), []);
});

test("no muestra un evento abierto cuyo fin ya pasó", () => {
  const pasado = evento("evt_pasado", "2026-10-01T10:00:00+02:00", "2026-10-01T11:00:00+02:00");
  assert.deepEqual(eventosActivos([pasado], ahora), []);
});

test("ordena cronológicamente por inicio", () => {
  const tarde = evento("evt_b", "2026-10-25T10:00:00+02:00", "2026-10-25T11:00:00+02:00");
  const pronto = evento("evt_a", "2026-10-15T10:00:00+02:00", "2026-10-15T11:00:00+02:00");
  assert.deepEqual(eventosActivos([tarde, pronto], ahora).map((e) => e.id), ["evt_a", "evt_b"]);
});

test("un evento en curso (fin futuro) sigue visible", () => {
  const enCurso = evento("evt_ahora", "2026-10-08T11:00:00+02:00", "2026-10-08T13:00:00+02:00");
  assert.equal(eventosActivos([enCurso], ahora).length, 1);
});

test("un evento completo (0 plazas) sigue en el catálogo mientras esté abierto", () => {
  const completo = { ...evento("evt_lleno", "2026-10-20T10:00:00+02:00", "2026-10-20T11:00:00+02:00"), plazasDisponibles: 0 };
  assert.equal(eventosActivos([completo], ahora).length, 1);
});

test("la semilla: ids únicos, vocabulario válido y plazas coherentes", () => {
  const ids = semilla.eventos.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of semilla.eventos) {
    assert.ok(DEPORTES.includes(e.deporte), `deporte no válido en ${e.id}`);
    assert.ok(e.plazasDisponibles >= 0 && e.plazasDisponibles <= e.aforoMaximo, `plazas incoherentes en ${e.id}`);
  }
});

test("la semilla oculta finalizados, cancelados y pasados, y deja el resto en orden", () => {
  const activos = eventosActivos(semilla.eventos, ahora);
  assert.ok(activos.length > 0);
  assert.ok(activos.every((e) => e.estado === "abierta" && new Date(e.fin) > ahora));
  const inicios = activos.map((e) => new Date(e.inicio).getTime());
  assert.deepEqual(inicios, [...inicios].sort((a, b) => a - b));
  assert.ok(activos.length < semilla.eventos.length);
});
