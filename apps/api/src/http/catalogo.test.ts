import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import type { Evento } from "../domain/modelo.ts";
import { manejarCatalogo, type LectorEventos } from "./catalogo.ts";

const AHORA = new Date("2026-10-08T12:00:00+02:00");

function evento(id: string, inicio: string, fin: string, estado: Evento["estado"] = "abierta"): Evento {
  return {
    id, titulo: id, deporte: "padel", nivel: "iniciacion", descripcion: "", inicio, fin,
    lugar: { nombre: "Pistas", puntoEncuentro: "Entrada", municipio: "Alcorcón", direccion: "Campus", lat: 0, lng: 0 },
    aforoMaximo: 8, plazasDisponibles: 3, material: [], estado,
    organizadorId: "usr_mock_001", communityGroupId: null, routineId: null,
  };
}

async function conServidor(store: LectorEventos, prueba: (base: string) => Promise<void>): Promise<void> {
  const servidor: Server = createServer((req, res) => manejarCatalogo(store, req, res, AHORA));
  await new Promise<void>((resolver) => servidor.listen(0, "127.0.0.1", resolver));
  const { port } = servidor.address() as AddressInfo;
  try {
    await prueba(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolver) => servidor.close(() => resolver()));
  }
}

test("GET /api/v1/events devuelve solo el catálogo activo, ordenado", async () => {
  const store = {
    listarEventos: () => [
      evento("evt_b", "2026-10-25T10:00:00+02:00", "2026-10-25T11:00:00+02:00"),
      evento("evt_fin", "2026-09-12T10:00:00+02:00", "2026-09-12T11:00:00+02:00", "finalizada"),
      evento("evt_a", "2026-10-15T10:00:00+02:00", "2026-10-15T11:00:00+02:00"),
    ],
  };
  await conServidor(store, async (base) => {
    const respuesta = await fetch(`${base}/api/v1/events`);
    assert.equal(respuesta.status, 200);
    const cuerpo = (await respuesta.json()) as { eventos: Evento[] };
    assert.deepEqual(cuerpo.eventos.map((e) => e.id), ["evt_a", "evt_b"]);
  });
});

test("sin eventos activos responde 200 con lista vacía", async () => {
  await conServidor({ listarEventos: () => [] }, async (base) => {
    const respuesta = await fetch(`${base}/api/v1/events`);
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), { eventos: [] });
  });
});

test("si el almacén falla responde 500 con mensaje en español", async () => {
  const roto = { listarEventos: (): Evento[] => { throw new Error("disco"); } };
  await conServidor(roto, async (base) => {
    const respuesta = await fetch(`${base}/api/v1/events`);
    assert.equal(respuesta.status, 500);
    const cuerpo = (await respuesta.json()) as { mensaje: string };
    assert.match(cuerpo.mensaje, /catálogo/);
  });
});

test("rutas y métodos no soportados", async () => {
  await conServidor({ listarEventos: () => [] }, async (base) => {
    assert.equal((await fetch(`${base}/api/v1/otra`)).status, 404);
    assert.equal((await fetch(`${base}/api/v1/events`, { method: "POST" })).status, 405);
  });
});

test("HU-03 / G3P-14: GET /api/v1/events?deporte= filtra por modalidad y rechaza deportes no válidos", async () => {
  const store = {
    listarEventos: (): Evento[] => [
      { ...evento("evt_padel", "2026-10-15T10:00:00+02:00", "2026-10-15T11:00:00+02:00"), deporte: "padel" },
      { ...evento("evt_yoga", "2026-10-16T10:00:00+02:00", "2026-10-16T11:00:00+02:00"), deporte: "yoga" },
    ],
  };
  await conServidor(store, async (base) => {
    const resPadel = await fetch(`${base}/api/v1/events?deporte=padel`);
    assert.equal(resPadel.status, 200);
    const cuerpoPadel = (await resPadel.json()) as { eventos: Evento[] };
    assert.deepEqual(cuerpoPadel.eventos.map((e) => e.id), ["evt_padel"]);

    const resVacio = await fetch(`${base}/api/v1/events?deporte=natacion`);
    assert.equal(resVacio.status, 200);
    const cuerpoVacio = (await resVacio.json()) as { eventos: Evento[] };
    assert.deepEqual(cuerpoVacio.eventos, []);

    const resInvalido = await fetch(`${base}/api/v1/events?deporte=baloncesto`);
    assert.equal(resInvalido.status, 400);
  });
});
