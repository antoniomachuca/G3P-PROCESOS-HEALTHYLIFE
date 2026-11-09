import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { ApiError, actualizarEvento } from "../src/api";
import { cambiosDesdeFormulario, cuerpoActualizacion, errorDeGuardado, valoresFormularioEdicion } from "../src/edicion";
import { CamposEdicionEvento } from "../src/components/FormularioEdicionEvento";
import { ModalConflictoAforo } from "../src/components/ModalConflictoAforo";
import type { Evento } from "../src/tipos";

// HU-08 / G3P-58: integración del formulario de edición con el PATCH y errores visuales.

const EVENTO: Evento = {
  id: "evt_edicion",
  titulo: "Yoga al aire libre",
  deporte: "yoga",
  nivel: "intermedio",
  descripcion: "Sesión de estiramientos",
  inicio: "2026-11-20T18:00:00+01:00",
  fin: "2026-11-20T19:30:00+01:00",
  lugar: {
    nombre: "Jardín central",
    puntoEncuentro: "Fuente del jardín",
    municipio: "Fuenlabrada",
    direccion: "Campus de Fuenlabrada",
    lat: 40.28,
    lng: -3.81,
  },
  aforoMaximo: 12,
  plazasDisponibles: 9,
  material: ["Esterilla", "Toalla"],
  estado: "abierta",
  organizadorId: "usr_mock_010",
  communityGroupId: null,
  routineId: null,
};

const sinAccion = () => {};
const sinCambios = () => cambiosDesdeFormulario(valoresFormularioEdicion(EVENTO));

async function conFetch<T>(
  respuesta: { status: number; cuerpo: unknown },
  prueba: (llamadas: Array<{ url: string; init?: RequestInit }>) => Promise<T>,
): Promise<T> {
  const original = globalThis.fetch;
  const llamadas: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    llamadas.push({ url: String(input), init });
    return new Response(JSON.stringify(respuesta.cuerpo), { status: respuesta.status });
  }) as typeof fetch;
  try {
    return await prueba(llamadas);
  } finally {
    globalThis.fetch = original;
  }
}

describe("G3P-58: cuerpo del PATCH", () => {
  it("sin cambios del usuario no envía ningún campo", () => {
    assert.deepEqual(cuerpoActualizacion(sinCambios(), EVENTO), {});
  });

  it("solo envía lo que cambia, con las claves del contrato", () => {
    const cambios = { ...sinCambios(), titulo: "Yoga al atardecer", puntoEncuentro: "Puerta norte", aforoMaximo: 15 };
    assert.deepEqual(cuerpoActualizacion(cambios, EVENTO), {
      titulo: "Yoga al atardecer",
      lugar: { puntoEncuentro: "Puerta norte" },
      aforoMaximo: 15,
    });
  });

  it("una fecha igual escrita con otro offset no cuenta como cambio", () => {
    const enUtc = { ...EVENTO, inicio: "2026-11-20T17:00:00Z", fin: "2026-11-20T18:30:00Z" };
    assert.deepEqual(cuerpoActualizacion(sinCambios(), enUtc), {});
  });

  it("detecta cambios de fecha, nivel y material", () => {
    const cambios = { ...sinCambios(), inicio: "2026-11-21T18:00:00+01:00", nivel: "competicion" as const, material: ["Esterilla"] };
    assert.deepEqual(cuerpoActualizacion(cambios, EVENTO), {
      inicio: "2026-11-21T18:00:00+01:00",
      nivel: "competicion",
      material: ["Esterilla"],
    });
  });
});

describe("G3P-58: actualizarEvento llama a la API", () => {
  it("hace PATCH con JSON y la cabecera X-User-Id, y devuelve el evento actualizado", async () => {
    const actualizado = { ...EVENTO, titulo: "Nuevo" };
    await conFetch({ status: 200, cuerpo: actualizado }, async (llamadas) => {
      const resultado = await actualizarEvento("evt_edicion", { titulo: "Nuevo" }, "usr_mock_010");
      assert.deepEqual(resultado, actualizado);
      assert.equal(llamadas.length, 1);
      assert.equal(llamadas[0].url, "/api/v1/events/evt_edicion");
      assert.equal(llamadas[0].init?.method, "PATCH");
      const cabeceras = llamadas[0].init?.headers as Record<string, string>;
      assert.equal(cabeceras["X-User-Id"], "usr_mock_010");
      assert.equal(cabeceras["Content-Type"], "application/json");
      assert.equal(llamadas[0].init?.body, JSON.stringify({ titulo: "Nuevo" }));
    });
  });

  it("un 409 de aforo se lanza como ApiError con el mensaje del servidor", async () => {
    const mensaje = "La capacidad no puede ser menor al número de usuarios ya inscritos (3)";
    await conFetch({ status: 409, cuerpo: { mensaje } }, async () => {
      await assert.rejects(actualizarEvento("evt_edicion", { aforoMaximo: 2 }, "usr_mock_010"), (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 409);
        assert.equal(error.message, mensaje);
        return true;
      });
    });
  });
});

describe("G3P-58: errores visuales", () => {
  it("el 409 se muestra como conflicto de aforo con el mensaje de la API", () => {
    assert.deepEqual(errorDeGuardado(new ApiError(409, "La capacidad no puede ser menor al número de usuarios ya inscritos (3)")), {
      tipo: "aforo",
      mensaje: "La capacidad no puede ser menor al número de usuarios ya inscritos (3)",
    });
  });

  it("el 403 explica que solo el organizador puede editar", () => {
    assert.deepEqual(errorDeGuardado(new ApiError(403, "Solo el organizador del evento puede editarlo")), {
      tipo: "general",
      mensaje: "Solo el organizador de la actividad puede editarla.",
    });
  });

  it("otros rechazos usan el mensaje de la API y un fallo de red da un texto propio", () => {
    assert.deepEqual(errorDeGuardado(new ApiError(400, "La nueva fecha de inicio debe ser futura")), {
      tipo: "general",
      mensaje: "La nueva fecha de inicio debe ser futura",
    });
    assert.equal(errorDeGuardado(new TypeError("Failed to fetch")).mensaje, "No se ha podido contactar con el servicio de actividades.");
  });

  it("el modal de aforo es un alertdialog con el mensaje y un botón para revisar la capacidad", () => {
    const html = renderToString(
      React.createElement(ModalConflictoAforo, {
        abierto: true,
        mensaje: "La capacidad no puede ser menor al número de usuarios ya inscritos (3)",
        onCerrar: sinAccion,
      }),
    );
    assert.match(html, /role="alertdialog"/);
    assert.match(html, /aria-modal="true"/);
    assert.match(html, /La capacidad no puede ser menor al número de usuarios ya inscritos \(3\)\./);
    assert.match(html, /Revisar capacidad/);
  });

  it("el modal cerrado no pinta nada", () => {
    assert.equal(renderToString(React.createElement(ModalConflictoAforo, { abierto: false, mensaje: "x", onCerrar: sinAccion })), "");
  });

  it("el formulario muestra el modal ante un conflicto de aforo, sin perder los campos", () => {
    const html = renderToString(
      React.createElement(CamposEdicionEvento, {
        evento: EVENTO,
        onGuardar: sinAccion,
        onCancelar: sinAccion,
        errorInicial: { tipo: "aforo", mensaje: "La capacidad no puede ser menor al número de usuarios ya inscritos (3)" },
      }),
    );
    assert.match(html, /role="alertdialog"/);
    assert.match(html, /name="titulo"/);
    assert.doesNotMatch(html, /formulario-edicion__error/);
  });

  it("el formulario muestra una alerta en línea para el resto de errores", () => {
    const html = renderToString(
      React.createElement(CamposEdicionEvento, {
        evento: EVENTO,
        onGuardar: sinAccion,
        onCancelar: sinAccion,
        errorInicial: { tipo: "general", mensaje: "La nueva fecha de inicio debe ser futura" },
      }),
    );
    assert.match(html, /<div class="formulario-edicion__error" role="alert">La nueva fecha de inicio debe ser futura<\/div>/);
    assert.doesNotMatch(html, /alertdialog/);
  });
});
