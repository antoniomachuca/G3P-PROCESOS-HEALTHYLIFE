import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { cargarInscripcionesUsuario, reservarPlaza } from "../src/api";
import {
  BotonReserva,
  IndicadorListaEspera,
  formatearTurnoListaEspera,
  resolverVistaBotonReserva,
} from "../src/components/BotonReserva";
import { TarjetaEvento } from "../src/components/TarjetaEvento";
import type { Evento } from "../src/tipos";

const EVENTO_COMPLETO: Evento = {
  id: "evt_full_001",
  titulo: "Running por el campus",
  deporte: "running",
  nivel: "intermedio",
  descripcion: "Salida grupal de 6 km a ritmo constante.",
  inicio: "2028-10-19T09:00:00+02:00",
  fin: "2028-10-19T10:00:00+02:00",
  lugar: {
    nombre: "Campus de Móstoles",
    puntoEncuentro: "Puerta principal del campus",
    municipio: "Móstoles",
    direccion: "Campus de Móstoles, Universidad Rey Juan Carlos",
    lat: 40.3347,
    lng: -3.8754,
  },
  aforoMaximo: 20,
  plazasDisponibles: 0,
  material: ["Zapatillas de running"],
  estado: "abierta",
  organizadorId: "usr_mock_002",
  communityGroupId: null,
  routineId: null,
  imagenUrl: "/img/eventos/running.jpg",
};

const EVENTO_CON_PLAZAS: Evento = {
  ...EVENTO_COMPLETO,
  id: "evt_open_001",
  plazasDisponibles: 3,
};

describe("HU-14 / G3P-101: lógica de presentación de lista de espera y turno", () => {
  it("formatea turnos válidos como 'Turno #N' y descarta valores ausentes o inválidos", () => {
    assert.equal(formatearTurnoListaEspera(1), "Turno #1");
    assert.equal(formatearTurnoListaEspera(2), "Turno #2");
    assert.equal(formatearTurnoListaEspera(14), "Turno #14");
    assert.equal(formatearTurnoListaEspera(null), null);
    assert.equal(formatearTurnoListaEspera(undefined), null);
    assert.equal(formatearTurnoListaEspera(0), null);
    assert.equal(formatearTurnoListaEspera(-2), null);
    assert.equal(formatearTurnoListaEspera(1.5), null);
    assert.equal(formatearTurnoListaEspera(Number.NaN), null);
  });

  it("habilita 'Apuntarme a lista de espera' cuando el evento tiene 0 plazas libres y el usuario no está inscrito", () => {
    const vista = resolverVistaBotonReserva({
      plazasDisponibles: 0,
      reservando: false,
    });
    assert.equal(vista.texto, "Apuntarme a lista de espera");
    assert.equal(vista.bloqueado, false);
    assert.equal(vista.variante, "lista-espera");
    assert.equal(vista.mostrarIndicadorEspera, false);
  });

  it("habilita 'Reservar plaza' cuando hay plazas disponibles y el usuario no está inscrito", () => {
    const vista = resolverVistaBotonReserva({
      plazasDisponibles: 3,
      reservando: false,
    });
    assert.equal(vista.texto, "Reservar plaza");
    assert.equal(vista.bloqueado, false);
    assert.equal(vista.variante, "primario");
  });

  it("bloquea el botón y expone 'En Espera' junto con 'Turno #2' cuando el usuario ya está en lista de espera", () => {
    const vista = resolverVistaBotonReserva({
      plazasDisponibles: 0,
      reservando: false,
      reserva: { estado: "en_espera", turno: 2 },
    });
    assert.equal(vista.texto, "En Espera");
    assert.equal(vista.bloqueado, true);
    assert.equal(vista.mostrarIndicadorEspera, true);
    assert.equal(vista.etiquetaEstadoEspera, "En Espera");
    assert.equal(vista.textoTurno, "Turno #2");
  });

  it("bloquea el botón cuando el usuario ya tiene plaza confirmada evitando duplicados", () => {
    const vista = resolverVistaBotonReserva({
      plazasDisponibles: 0,
      reservando: false,
      reserva: { estado: "confirmada" },
    });
    assert.equal(vista.texto, "Plaza confirmada");
    assert.equal(vista.bloqueado, true);
    assert.equal(vista.mostrarIndicadorEspera, false);
  });

  it("bloquea el botón mientras la solicitud está en curso", () => {
    const vistaEspera = resolverVistaBotonReserva({ plazasDisponibles: 0, reservando: true });
    assert.equal(vistaEspera.bloqueado, true);
    assert.equal(vistaEspera.texto, "Apuntándome...");

    const vistaNormal = resolverVistaBotonReserva({ plazasDisponibles: 2, reservando: true });
    assert.equal(vistaNormal.bloqueado, true);
    assert.equal(vistaNormal.texto, "Reservando...");
  });
});

describe("HU-14 / G3P-101: renderizado e interacción de BotonReserva y TarjetaEvento", () => {
  it("renderiza el botón habilitado 'Apuntarme a lista de espera' en un evento con 0 plazas", () => {
    const html = renderToString(
      React.createElement(BotonReserva, {
        evento: EVENTO_COMPLETO,
        reservando: false,
        onReservar: () => {},
      }),
    );
    assert.match(html, />Apuntarme a lista de espera<\/button>/);
    assert.doesNotMatch(html, /disabled=""/);
    assert.match(html, /boton--lista-espera/);
    assert.doesNotMatch(html, /indicador-espera/);
  });

  it("renderiza el estado 'En Espera', el turno 'Turno #2' y el botón bloqueado tras apuntarse", () => {
    const html = renderToString(
      React.createElement(BotonReserva, {
        evento: EVENTO_COMPLETO,
        reservando: false,
        reserva: { estado: "en_espera", turno: 2 },
        onReservar: () => {},
      }),
    );
    assert.match(html, /disabled=""/);
    assert.match(html, /aria-disabled="true"/);
    assert.match(html, /role="status"/);
    assert.match(html, /En Espera/);
    assert.match(html, /Turno #2/);
  });

  it("muestra un texto informativo si aún no hay número de turno asignado en IndicadorListaEspera", () => {
    const html = renderToString(React.createElement(IndicadorListaEspera, { turno: null }));
    assert.match(html, /En Espera/);
    assert.match(html, /En cola por orden de llegada/);
  });

  it("bloquea el botón si el usuario ya tiene plaza confirmada", () => {
    const html = renderToString(
      React.createElement(BotonReserva, {
        evento: EVENTO_CON_PLAZAS,
        reservando: false,
        reserva: { estado: "confirmada" },
        onReservar: () => {},
      }),
    );
    assert.match(html, />Plaza confirmada<\/button>/);
    assert.match(html, /disabled=""/);
    assert.match(html, /aria-disabled="true"/);
  });

  it("invoca onReservar al pulsar 'Apuntarme a lista de espera' y bloquea pulsaciones duplicadas", () => {
    let llamadas = 0;

    const habilitado = BotonReserva({
      evento: EVENTO_COMPLETO,
      reservando: false,
      onReservar: () => {
        llamadas += 1;
      },
    });
    const botonHabilitado = habilitado.props.children[0];
    assert.equal(botonHabilitado.props.disabled, false);
    botonHabilitado.props.onClick();
    assert.equal(llamadas, 1);

    const yaEnEspera = BotonReserva({
      evento: EVENTO_COMPLETO,
      reservando: false,
      reserva: { estado: "en_espera", turno: 2 },
      onReservar: () => {
        llamadas += 1;
      },
    });
    const botonEnEspera = yaEnEspera.props.children[0];
    assert.equal(botonEnEspera.props.disabled, true);
    botonEnEspera.props.onClick();
    assert.equal(llamadas, 1, "Un botón bloqueado en lista de espera no debe disparar onReservar");

    const yaConfirmado = BotonReserva({
      evento: EVENTO_CON_PLAZAS,
      reservando: false,
      reserva: { estado: "confirmada" },
      onReservar: () => {
        llamadas += 1;
      },
    });
    const botonConfirmado = yaConfirmado.props.children[0];
    assert.equal(botonConfirmado.props.disabled, true);
    botonConfirmado.props.onClick();
    assert.equal(llamadas, 1, "Un botón bloqueado con plaza confirmada no debe disparar onReservar");
  });

  it("en TarjetaEvento muestra 'Apuntarme a lista de espera' habilitado con 0 plazas y muestra el turno si está en espera", () => {
    const htmlCompleto = renderToString(
      React.createElement(TarjetaEvento, {
        evento: EVENTO_COMPLETO,
        tieneReserva: false,
      }),
    );
    assert.match(htmlCompleto, /Apuntarme a lista de espera/);
    assert.doesNotMatch(htmlCompleto, /disabled=""/);

    const htmlEnEspera = renderToString(
      React.createElement(TarjetaEvento, {
        evento: EVENTO_COMPLETO,
        estadoReserva: "en_espera",
        turno: 3,
      }),
    );
    assert.match(htmlEnEspera, /En Espera/);
    assert.match(htmlEnEspera, /Turno #3/);
  });
});

describe("HU-14 / G3P-101: soporte de estado en_espera y turno en cliente API", () => {
  it("reservarPlaza conserva estado 'en_espera' y turno devuelto por la API", async () => {
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          id: "ins_wait_002",
          eventoId: "evt_full_001",
          usuarioId: "usr_mock_010",
          estado: "en_espera",
          creadaEn: "2026-11-28T14:00:00+01:00",
          plazasDisponibles: 0,
          turno: 2,
        }),
        { status: 201 },
      )) as typeof fetch;

    try {
      const resultado = await reservarPlaza("evt_full_001", "usr_mock_010");
      assert.equal(resultado.estado, "en_espera");
      assert.equal(resultado.turno, 2);
      assert.equal(resultado.plazasDisponibles, 0);
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  });

  it("cargarInscripcionesUsuario interpreta estado en_espera con turno y mantiene compatibilidad con formato previo", async () => {
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          user_id: "usr_mock_010",
          events: [
            { event_id: "evt_001" },
            { event_id: "evt_002", estado: "en_espera", turno: 2 },
          ],
        }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const mapa = await cargarInscripcionesUsuario("usr_mock_010");
      assert.deepEqual(mapa["evt_001"], { estado: "confirmada", turno: null });
      assert.deepEqual(mapa["evt_002"], { estado: "en_espera", turno: 2 });
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  });
});
