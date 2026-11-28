import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  LONGITUD_MAXIMA_DETALLE,
  MENSAJE_DETALLE_LARGO,
  MENSAJE_EVENTO_FINALIZADO,
  MENSAJE_EVENTO_YA_CANCELADO,
  MENSAJE_FALTA_DETALLE,
  MENSAJE_FALTA_MOTIVO,
  construirMotivo,
  estadoOpcionCancelacion,
  eventoFinalizado,
  inscritosDelEvento,
} from "../src/cancelacion-evento";
import { BotonCancelarEvento } from "../src/components/BotonCancelarEvento";
import { ModalCancelacionEvento, type ModalCancelacionEventoProps } from "../src/components/ModalCancelacionEvento";
import type { Evento } from "../src/tipos";

const AHORA = new Date("2026-11-28T10:00:00+01:00");

const EVENTO: Evento = {
  id: "evt_hu09_001",
  titulo: "Running por el campus",
  deporte: "running",
  nivel: "iniciacion",
  descripcion: "Salida suave de 5 km",
  inicio: "2026-12-05T09:00:00+01:00",
  fin: "2026-12-05T10:30:00+01:00",
  lugar: { nombre: "Pista de atletismo", puntoEncuentro: "Puerta norte", municipio: "Móstoles", direccion: "C/ Tulipán s/n", lat: 40.33, lng: -3.88 },
  aforoMaximo: 20,
  plazasDisponibles: 14,
  material: [],
  estado: "abierta",
  organizadorId: "usr_mock_010",
  communityGroupId: null,
  routineId: null,
};

describe("HU-09 / G3P-80: motivo de la cancelación", () => {
  it("exige elegir un motivo", () => {
    assert.deepEqual(construirMotivo("", "algo"), { ok: false, error: MENSAJE_FALTA_MOTIVO });
  });

  it("con un motivo predefinido el detalle es opcional", () => {
    assert.deepEqual(construirMotivo("lluvia", "   "), { ok: true, motivo: "Lluvia o condiciones meteorológicas adversas" });
  });

  it("añade el detalle tras el motivo predefinido", () => {
    assert.deepEqual(construirMotivo("cierre_pistas", " Mantenimiento del césped "), {
      ok: true,
      motivo: "Cierre de las pistas o la instalación: Mantenimiento del césped",
    });
  });

  it("con «Otro motivo» el detalle es obligatorio", () => {
    assert.deepEqual(construirMotivo("otro", "  "), { ok: false, error: MENSAJE_FALTA_DETALLE });
    assert.deepEqual(construirMotivo("otro", "Huelga de transporte"), { ok: true, motivo: "Huelga de transporte" });
  });

  it("rechaza un detalle demasiado largo", () => {
    assert.deepEqual(construirMotivo("lluvia", "a".repeat(LONGITUD_MAXIMA_DETALLE + 1)), { ok: false, error: MENSAJE_DETALLE_LARGO });
  });
});

describe("HU-09 / G3P-80: cuándo se puede cancelar", () => {
  it("una actividad abierta y futura se puede cancelar", () => {
    assert.deepEqual(estadoOpcionCancelacion(EVENTO, AHORA), { habilitada: true });
  });

  it("una actividad cuyo fin ya pasó está finalizada aunque su estado diga abierta", () => {
    const pasada = { ...EVENTO, inicio: "2026-11-20T09:00:00+01:00", fin: "2026-11-20T10:00:00+01:00" };
    assert.equal(eventoFinalizado(pasada, AHORA), true);
    assert.deepEqual(estadoOpcionCancelacion(pasada, AHORA), { habilitada: false, razon: MENSAJE_EVENTO_FINALIZADO });
  });

  it("el estado «finalizada» desactiva la opción", () => {
    assert.deepEqual(estadoOpcionCancelacion({ ...EVENTO, estado: "finalizada" }, AHORA), {
      habilitada: false,
      razon: MENSAJE_EVENTO_FINALIZADO,
    });
  });

  it("una actividad ya cancelada no se puede volver a cancelar", () => {
    assert.deepEqual(estadoOpcionCancelacion({ ...EVENTO, estado: "cancelada" }, AHORA), {
      habilitada: false,
      razon: MENSAJE_EVENTO_YA_CANCELADO,
    });
  });

  it("una fecha de fin inválida cuenta como finalizada", () => {
    assert.equal(eventoFinalizado({ estado: "abierta", fin: "no-es-fecha" }, AHORA), true);
  });

  it("cuenta los inscritos como plazas ocupadas", () => {
    assert.equal(inscritosDelEvento(EVENTO), 6);
  });
});

describe("HU-09 / G3P-80: botón «Cancelar actividad»", () => {
  it("sale activo en una actividad futura", () => {
    const html = renderToString(React.createElement(BotonCancelarEvento, { evento: EVENTO, onCancelar: async () => {}, fechaReferencia: AHORA }));
    assert.match(html, /Cancelar actividad/);
    assert.doesNotMatch(html, / disabled=""/);
  });

  it("sale desactivado y con la razón en una actividad finalizada", () => {
    const pasada = { ...EVENTO, fin: "2026-11-01T10:00:00+01:00" };
    const html = renderToString(React.createElement(BotonCancelarEvento, { evento: pasada, onCancelar: async () => {}, fechaReferencia: AHORA }));
    assert.match(html, /disabled=""/);
    assert.ok(html.includes(MENSAJE_EVENTO_FINALIZADO));
  });
});

/** Arnés mínimo de hooks, como en cancelacion.interaction.test.ts, para recorrer los pasos del modal sin DOM. */
function arnes(props: ModalCancelacionEventoProps) {
  const estado: unknown[] = [];
  let indice = 0;
  const dispatcher = {
    useState<T>(inicial: T) {
      const i = indice++;
      if (i >= estado.length) estado.push(inicial);
      return [estado[i] as T, (v: T) => { estado[i] = v; }] as const;
    },
    useEffect() {},
  };
  return function render() {
    indice = 0;
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    return ModalCancelacionEvento(props) as React.ReactElement;
  };
}

function buscar(nodo: any, cumple: (n: any) => boolean): any[] {
  if (nodo == null || typeof nodo !== "object") return [];
  if (Array.isArray(nodo)) return nodo.flatMap((n) => buscar(n, cumple));
  const propios = cumple(nodo) ? [nodo] : [];
  return [...propios, ...buscar(nodo.props?.children, cumple)];
}

function texto(nodo: any): string {
  if (nodo == null || typeof nodo === "boolean") return "";
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(texto).join("");
  return texto(nodo.props?.children);
}

const boton = (vdom: any, etiqueta: string) => buscar(vdom, (n) => n.type === "button" && texto(n) === etiqueta)[0];

describe("HU-09 / G3P-80: modal de motivo y confirmación", () => {
  it("no llama a la API sin motivo y muestra el error", () => {
    let llamadas = 0;
    const render = arnes({ abierto: true, tituloEvento: EVENTO.titulo, inscritos: 6, onDescartar() {}, onConfirmar: async () => { llamadas++; } });
    boton(render(), "Continuar").props.onClick();
    const vdom = render();
    assert.ok(texto(vdom).includes(MENSAJE_FALTA_MOTIVO));
    assert.equal(boton(vdom, "Confirmar cancelación"), undefined, "sin motivo no se pasa al paso 2");
    assert.equal(llamadas, 0);
  });

  it("elige motivo, pasa a la confirmación y envía el motivo compuesto", async () => {
    const recibidos: string[] = [];
    const render = arnes({ abierto: true, tituloEvento: EVENTO.titulo, inscritos: 6, onDescartar() {}, onConfirmar: async (m) => { recibidos.push(m); } });

    const radio = buscar(render(), (n) => n.type === "input" && n.props.value === "lluvia")[0];
    radio.props.onChange();
    boton(render(), "Continuar").props.onClick();

    const paso2 = render();
    assert.ok(texto(paso2).includes("paso 2 de 2"));
    assert.ok(texto(paso2).includes("Se informará a las 6 personas inscritas"));
    assert.equal(recibidos.length, 0, "el paso 1 no envía nada");

    await boton(paso2, "Confirmar cancelación").props.onClick();
    await new Promise((r) => setImmediate(r));
    assert.deepEqual(recibidos, ["Lluvia o condiciones meteorológicas adversas"]);
  });

  it("si la API falla, el modal sigue abierto con el mensaje", async () => {
    const render = arnes({
      abierto: true,
      tituloEvento: EVENTO.titulo,
      inscritos: 0,
      onDescartar() {},
      onConfirmar: async () => { throw new Error("Solo el organizador de la actividad puede cancelarla."); },
    });
    buscar(render(), (n) => n.type === "input" && n.props.value === "indisposicion")[0].props.onChange();
    boton(render(), "Continuar").props.onClick();
    boton(render(), "Confirmar cancelación").props.onClick();
    await new Promise((r) => setImmediate(r));
    const vdom = render();
    assert.ok(texto(vdom).includes("Solo el organizador de la actividad puede cancelarla."));
    assert.ok(boton(vdom, "Confirmar cancelación"), "se puede reintentar");
  });

  it("cerrado no pinta nada", () => {
    const html = renderToString(
      React.createElement(ModalCancelacionEvento, { abierto: false, tituloEvento: "x", inscritos: 0, onDescartar() {}, onConfirmar: async () => {} }),
    );
    assert.equal(html, "");
  });
});
