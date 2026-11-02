import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { cambiosDesdeFormulario, isoEnMadrid, valoresFormularioEdicion } from "../src/edicion";
import { CamposEdicionEvento } from "../src/components/FormularioEdicionEvento";
import type { Evento } from "../src/tipos";

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
  organizadorId: "usr_mock_001",
  communityGroupId: null,
  routineId: null,
};

const sinAccion = () => {};

/** Devuelve la etiqueta <input|select|textarea> con ese name en el HTML renderizado. */
function campo(html: string, nombre: string): string {
  const coincidencia = html.match(new RegExp(`<(input|select|textarea)[^>]*name="${nombre}"[^>]*>`));
  assert.ok(coincidencia, `falta el campo ${nombre}`);
  return coincidencia[0];
}

describe("HU-08 / G3P-55: precarga del formulario de edición", () => {
  it("convierte el evento guardado en los valores del formulario, en hora de Madrid", () => {
    assert.deepEqual(valoresFormularioEdicion(EVENTO), {
      titulo: "Yoga al aire libre",
      descripcion: "Sesión de estiramientos",
      fecha: "2026-11-20",
      horaInicio: "18:00",
      horaFin: "19:30",
      puntoEncuentro: "Fuente del jardín",
      nivel: "intermedio",
      material: "Esterilla, Toalla",
      aforoMaximo: 12,
      deporte: "yoga",
      lugar: "Jardín central · Fuenlabrada",
      plazasOcupadas: 3,
    });
  });

  it("muestra la hora de Madrid aunque el evento venga guardado en UTC", () => {
    const valores = valoresFormularioEdicion({ ...EVENTO, inicio: "2026-07-01T23:30:00Z", fin: "2026-07-02T00:30:00Z" });
    assert.equal(valores.fecha, "2026-07-02");
    assert.equal(valores.horaInicio, "01:30");
    assert.equal(valores.horaFin, "02:30");
  });

  it("isoEnMadrid aplica +01:00 en invierno y +02:00 en verano", () => {
    assert.equal(isoEnMadrid("2026-12-10", "10:00"), "2026-12-10T10:00:00+01:00");
    assert.equal(isoEnMadrid("2026-06-10", "10:00"), "2026-06-10T10:00:00+02:00");
  });

  it("sin cambios del usuario, los cambios resultantes describen el mismo evento", () => {
    const cambios = cambiosDesdeFormulario(valoresFormularioEdicion(EVENTO));
    assert.deepEqual(cambios, {
      titulo: EVENTO.titulo,
      descripcion: EVENTO.descripcion,
      inicio: EVENTO.inicio,
      fin: EVENTO.fin,
      nivel: EVENTO.nivel,
      puntoEncuentro: EVENTO.lugar.puntoEncuentro,
      material: EVENTO.material,
      aforoMaximo: EVENTO.aforoMaximo,
    });
  });

  it("el material se limpia de espacios y entradas vacías", () => {
    const cambios = cambiosDesdeFormulario({ ...valoresFormularioEdicion(EVENTO), material: " Pala ,, Agua , " });
    assert.deepEqual(cambios.material, ["Pala", "Agua"]);
  });
});

describe("HU-08 / G3P-55: interfaz del formulario de edición", () => {
  const html = renderToString(
    React.createElement(CamposEdicionEvento, { evento: EVENTO, onGuardar: sinAccion, onCancelar: sinAccion }),
  );

  it("precarga los campos editables con los datos actuales del evento", () => {
    assert.match(campo(html, "titulo"), /value="Yoga al aire libre"/);
    assert.match(html, /<textarea[^>]*name="descripcion"[^>]*>Sesión de estiramientos<\/textarea>/);
    assert.match(campo(html, "fecha"), /value="2026-11-20"/);
    assert.match(campo(html, "horaInicio"), /value="18:00"/);
    assert.match(campo(html, "horaFin"), /value="19:30"/);
    assert.match(campo(html, "puntoEncuentro"), /value="Fuente del jardín"/);
    assert.match(campo(html, "material"), /value="Esterilla, Toalla"/);
    assert.match(campo(html, "aforoMaximo"), /value="12"/);
    assert.match(html, /<option value="intermedio" selected="">Intermedio<\/option>/);
  });

  it("los campos editables no están bloqueados", () => {
    for (const nombre of ["titulo", "descripcion", "fecha", "horaInicio", "horaFin", "puntoEncuentro", "nivel", "material", "aforoMaximo"]) {
      assert.doesNotMatch(campo(html, nombre), /disabled|readOnly|readonly/, `${nombre} no debería estar bloqueado`);
    }
  });

  it("deporte, lugar (campus) y plazas ocupadas se muestran en solo lectura", () => {
    for (const nombre of ["deporte", "lugar", "plazasOcupadas"]) {
      const etiqueta = campo(html, nombre);
      assert.match(etiqueta, /readOnly=""|readonly=""/, `${nombre} debería ser de solo lectura`);
      assert.match(etiqueta, /disabled=""/, `${nombre} debería estar deshabilitado`);
    }
    assert.match(campo(html, "deporte"), /value="Yoga"/);
    assert.match(campo(html, "lugar"), /value="Jardín central · Fuenlabrada"/);
    assert.match(campo(html, "plazasOcupadas"), /value="3"/);
  });

  it("la capacidad no se puede bajar por debajo de las plazas ocupadas en el propio campo", () => {
    assert.match(campo(html, "aforoMaximo"), /min="3"/);
  });
});
