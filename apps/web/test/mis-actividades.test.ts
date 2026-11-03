import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { cargarMisActividades } from "../src/api";
import { VistaPanelMisActividades, type EstadoPanel } from "../src/components/PanelMisActividades";
import type { Evento } from "../src/tipos";

function evento(id: string, titulo: string): Evento {
  return {
    id,
    titulo,
    deporte: "padel",
    nivel: "intermedio",
    descripcion: "Partido",
    inicio: "2028-10-20T10:00:00+02:00",
    fin: "2028-10-20T11:30:00+02:00",
    lugar: {
      nombre: "Pistas Pádel",
      puntoEncuentro: "Pista 1",
      municipio: "Fuenlabrada",
      direccion: "Campus Fuenlabrada URJC",
      lat: 40.28,
      lng: -3.81,
    },
    aforoMaximo: 4,
    plazasDisponibles: 2,
    material: ["Pala"],
    estado: "abierta",
    organizadorId: "usr_org_001",
    communityGroupId: null,
    routineId: null,
  };
}

function pintar(estado: EstadoPanel): string {
  return renderToString(
    createElement(VistaPanelMisActividades, {
      estado,
      onAbrir: () => {},
      onReintentar: () => {},
      onExplorarCatalogo: () => {},
    }),
  );
}

test("HU-17: con reservas muestra título, fecha, hora y lugar de cada tarjeta, en el orden recibido", () => {
  const html = pintar({ tipo: "listo", eventos: [evento("evt_1", "Pádel primero"), evento("evt_2", "Pádel segundo")] });
  assert.ok(html.indexOf("Pádel primero") < html.indexOf("Pádel segundo"));
  assert.match(html, /10:00 - 11:30h/);
  assert.match(html, /Pistas Pádel/);
  assert.match(html, /Fuenlabrada/);
  assert.doesNotMatch(html, /No tienes reservas programadas/);
});

test("HU-17: sin actividades futuras muestra el mensaje informativo y el enlace al catálogo", () => {
  const html = pintar({ tipo: "listo", eventos: [] });
  assert.match(html, /No tienes reservas programadas/);
  assert.match(html, /href="#catalogo"/);
  assert.match(html, /Explorar el catálogo/);
});

test("HU-17: el estado de error ofrece reintentar, no deja la pantalla en blanco", () => {
  const html = pintar({ tipo: "error" });
  assert.match(html, /role="alert"/);
  assert.match(html, /Reintentar/);
});

test("HU-17: cargarMisActividades llama a GET /api/v1/me/events con X-User-Id", async () => {
  const fetchOriginal = globalThis.fetch;
  let url = "";
  let usuario = "";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    url = String(input);
    usuario = (init?.headers as Record<string, string>)["X-User-Id"];
    return new Response(JSON.stringify({ eventos: [evento("evt_1", "Pádel")] }), { status: 200 });
  }) as typeof fetch;
  try {
    const eventos = await cargarMisActividades("usr_mock_010");
    assert.equal(url, "/api/v1/me/events");
    assert.equal(usuario, "usr_mock_010");
    assert.equal(eventos.length, 1);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});
