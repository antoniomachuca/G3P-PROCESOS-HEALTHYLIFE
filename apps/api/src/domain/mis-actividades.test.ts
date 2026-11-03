import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { actividadesProximas } from "./catalogo.ts";
import type { CatalogoEventos, Evento } from "./modelo.ts";

const semilla = JSON.parse(
  readFileSync(new URL("../../../../data/eventos.json", import.meta.url), "utf8"),
) as CatalogoEventos;

const ahora = new Date("2026-10-08T12:00:00+02:00");

function evento(id: string, inicio: string, fin: string, estado: Evento["estado"] = "abierta"): Evento {
  return { ...semilla.eventos[0], id, inicio, fin, estado };
}

test("HU-17: ordena las actividades futuras cronológicamente", () => {
  const tarde = evento("evt_b", "2026-10-25T10:00:00+02:00", "2026-10-25T11:00:00+02:00");
  const pronto = evento("evt_a", "2026-10-15T10:00:00+02:00", "2026-10-15T11:00:00+02:00");
  assert.deepEqual(actividadesProximas([tarde, pronto], ahora).map((e) => e.id), ["evt_a", "evt_b"]);
});

test("HU-17: una actividad que ya superó su fecha y hora de fin deja de mostrarse", () => {
  const pasada = evento("evt_pasada", "2026-10-01T10:00:00+02:00", "2026-10-01T11:00:00+02:00");
  const futura = evento("evt_futura", "2026-10-15T10:00:00+02:00", "2026-10-15T11:00:00+02:00");
  assert.deepEqual(actividadesProximas([pasada, futura], ahora).map((e) => e.id), ["evt_futura"]);
});

test("HU-17: una actividad en curso (fin futuro) sigue en el panel", () => {
  const enCurso = evento("evt_ahora", "2026-10-08T11:00:00+02:00", "2026-10-08T13:00:00+02:00");
  assert.equal(actividadesProximas([enCurso], ahora).length, 1);
});

test("HU-17: no muestra eventos cancelados ni finalizados", () => {
  const cancelado = evento("evt_c", "2026-10-20T10:00:00+02:00", "2026-10-20T11:00:00+02:00", "cancelada");
  const finalizado = evento("evt_f", "2026-10-21T10:00:00+02:00", "2026-10-21T11:00:00+02:00", "finalizada");
  assert.deepEqual(actividadesProximas([cancelado, finalizado], ahora), []);
});

test("HU-17: sin actividades devuelve una lista vacía", () => {
  assert.deepEqual(actividadesProximas([], ahora), []);
});
