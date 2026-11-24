import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { FormularioEvento, construirPayloadCreacion, type DatosFormularioCreacion } from "../src/FormularioEvento";
import { CamposEdicionEvento } from "../src/components/FormularioEdicionEvento";
import { cambiosDesdeFormulario, cuerpoActualizacion, valoresFormularioEdicion } from "../src/edicion";
import type { Evento } from "../src/tipos";

// HU-11 / G3P-97: campos de aforo mínimo y hora límite de inscripción en formularios y modelo web.

const DATOS_BASE: DatosFormularioCreacion = {
  titulo: "Fútbol sala universitario",
  descripcion: "Partido 5 contra 5 en el pabellón",
  deporte: "futbol",
  nivel: "intermedio",
  fecha: "2026-10-20",
  hora: "19:30",
  duracion: "2",
  lugarNombre: "Pabellón cubierto",
  lugarPuntoEncuentro: "Puerta lateral",
  lugarMunicipio: "Vicálvaro",
  lugarDireccion: "Campus de Vicálvaro",
  aforoMaximo: "14",
  aforoMinimo: "10",
  fechaLimite: "2026-10-20",
  horaLimite: "18:30",
  material: "Botas, Espinilleras",
  organizadorId: "usr_mock_010",
};

const EVENTO_CON_LIMITE: Evento = {
  id: "evt_futbol",
  titulo: "Fútbol sala universitario",
  deporte: "futbol",
  nivel: "intermedio",
  descripcion: "Partido 5 contra 5",
  inicio: "2026-10-20T19:30:00+02:00",
  fin: "2026-10-20T21:00:00+02:00",
  lugar: {
    nombre: "Pabellón cubierto",
    puntoEncuentro: "Puerta lateral",
    municipio: "Vicálvaro",
    direccion: "Campus de Vicálvaro",
    lat: 40.4058,
    lng: -3.6083,
  },
  aforoMaximo: 14,
  plazasDisponibles: 4,
  aforoMinimo: 10,
  fechaLimiteInscripcion: "2026-10-20T18:30:00+02:00",
  material: ["Botas"],
  estado: "abierta",
  organizadorId: "usr_mock_010",
  communityGroupId: null,
  routineId: null,
};

function campo(html: string, nombre: string): string {
  const coincidencia = html.match(new RegExp(`<(input|select|textarea)[^>]*name="${nombre}"[^>]*>`));
  assert.ok(coincidencia, `falta el campo ${nombre}`);
  return coincidencia[0];
}

describe("HU-11 / G3P-97: formulario de publicación", () => {
  it("renderiza los campos editables de aforo mínimo y fecha/hora límite", () => {
    const html = renderToString(
      React.createElement(FormularioEvento, { onCreado: () => {}, onCancelar: () => {} }),
    );
    for (const nombre of ["aforoMinimo", "fechaLimite", "horaLimite"]) {
      assert.doesNotMatch(campo(html, nombre), /disabled|readOnly|readonly/);
    }
    assert.match(html, /Aforo mínimo/);
    assert.match(html, /Fecha límite de inscripción/);
    assert.match(html, /Hora límite de inscripción/);
  });

  it("construye el payload con aforoMinimo y fechaLimiteInscripcion en ISO-8601 con offset", () => {
    const payload = construirPayloadCreacion(DATOS_BASE);
    assert.equal(payload.aforoMaximo, 14);
    assert.equal(payload.aforoMinimo, 10);
    assert.equal(payload.inicio, "2026-10-20T19:30:00+02:00");
    assert.equal(payload.fechaLimiteInscripcion, "2026-10-20T18:30:00+02:00");
  });

  it("si solo se indica horaLimite, toma el mismo día del evento", () => {
    const payload = construirPayloadCreacion({ ...DATOS_BASE, fechaLimite: "", horaLimite: "18:00" });
    assert.equal(payload.fechaLimiteInscripcion, "2026-10-20T18:00:00+02:00");
  });

  it("si los campos opcionales quedan vacíos, envía null", () => {
    const payload = construirPayloadCreacion({
      ...DATOS_BASE,
      aforoMinimo: "",
      fechaLimite: "",
      horaLimite: "",
    });
    assert.equal(payload.aforoMinimo, null);
    assert.equal(payload.fechaLimiteInscripcion, null);
  });

  it("rechaza aforo mínimo mayor que el máximo o hora límite posterior al inicio", () => {
    assert.throws(
      () => construirPayloadCreacion({ ...DATOS_BASE, aforoMinimo: "15" }),
      /aforo mínimo no puede superar el aforo máximo/,
    );
    assert.throws(
      () => construirPayloadCreacion({ ...DATOS_BASE, aforoMinimo: "0" }),
      /entero mayor que cero/,
    );
    assert.throws(
      () => construirPayloadCreacion({ ...DATOS_BASE, fechaLimite: "2026-10-20", horaLimite: "" }),
      /hora límite de inscripción/,
    );
    assert.throws(
      () => construirPayloadCreacion({ ...DATOS_BASE, fechaLimite: "2026-10-20", horaLimite: "19:30" }),
      /anterior al inicio/,
    );
  });
});

describe("HU-11 / G3P-97: precarga y actualización en edición", () => {
  it("precarga aforoMinimo y fecha/hora límite en el formulario de edición", () => {
    const valores = valoresFormularioEdicion(EVENTO_CON_LIMITE);
    assert.equal(valores.aforoMinimo, "10");
    assert.equal(valores.fechaLimite, "2026-10-20");
    assert.equal(valores.horaLimite, "18:30");

    const html = renderToString(
      React.createElement(CamposEdicionEvento, {
        evento: EVENTO_CON_LIMITE,
        onGuardar: () => {},
        onCancelar: () => {},
      }),
    );
    assert.match(campo(html, "aforoMinimo"), /value="10"/);
    assert.match(campo(html, "fechaLimite"), /value="2026-10-20"/);
    assert.match(campo(html, "horaLimite"), /value="18:30"/);
  });

  it("envía aforoMinimo y fechaLimiteInscripcion en el PATCH solo cuando cambian", () => {
    const base = cambiosDesdeFormulario(valoresFormularioEdicion(EVENTO_CON_LIMITE));
    assert.deepEqual(cuerpoActualizacion(base, EVENTO_CON_LIMITE), {});

    const editado = { ...base, aforoMinimo: 8, fechaLimiteInscripcion: "2026-10-20T17:00:00+02:00" };
    assert.deepEqual(cuerpoActualizacion(editado, EVENTO_CON_LIMITE), {
      aforoMinimo: 8,
      fechaLimiteInscripcion: "2026-10-20T17:00:00+02:00",
    });

    const limpio = { ...base, aforoMinimo: null, fechaLimiteInscripcion: null };
    assert.deepEqual(cuerpoActualizacion(limpio, EVENTO_CON_LIMITE), {
      aforoMinimo: null,
      fechaLimiteInscripcion: null,
    });
  });
});
