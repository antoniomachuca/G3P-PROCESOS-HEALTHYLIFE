import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { eventoYaIniciado } from '../src/cancelacion';
import { ModalConfirmacionCancelacion } from '../src/components/ModalConfirmacionCancelacion';
import { BotonCancelarInscripcion } from '../src/components/BotonCancelarInscripcion';
import { TarjetaEvento } from '../src/components/TarjetaEvento';
import type { Evento } from '../src/tipos';

const EVENTO_BASE: Evento = {
  id: 'evt_test_001',
  titulo: 'Torneo Pádel URJC',
  deporte: 'padel',
  nivel: 'intermedio',
  descripcion: 'Torneo universitario de pádel',
  inicio: '2026-11-20T10:00:00.000Z',
  fin: '2026-11-20T12:00:00.000Z',
  lugar: {
    nombre: 'Pistas Centrales',
    puntoEncuentro: 'Acceso Pistas',
    municipio: 'Fuenlabrada',
    direccion: 'Camino del Molino s/n',
    lat: 40.28,
    lng: -3.81,
  },
  aforoMaximo: 16,
  plazasDisponibles: 4,
  material: ['Pala propia'],
  estado: 'abierta',
  organizadorId: 'usr_org_01',
  communityGroupId: null,
  routineId: null,
};

describe('HU-13 / G3P-59: Lógica visual y bloqueo de cancelación por fecha', () => {
  const FECHA_REFERENCIA = new Date('2026-10-31T12:00:00.000Z');

  describe('Función eventoYaIniciado', () => {
    it('devuelve false cuando la fecha de inicio está en el futuro', () => {
      const inicioFuturo = '2026-11-15T10:00:00.000Z';
      assert.equal(eventoYaIniciado(inicioFuturo, FECHA_REFERENCIA), false);
    });

    it('devuelve true cuando la fecha de inicio es anterior a la fecha de referencia (evento ya comenzado o finalizado)', () => {
      const inicioPasado = '2026-10-18T10:00:00.000Z';
      assert.equal(eventoYaIniciado(inicioPasado, FECHA_REFERENCIA), true);
    });

    it('devuelve true cuando la fecha de inicio coincide exactamente con la fecha de referencia', () => {
      const inicioExacto = '2026-10-31T12:00:00.000Z';
      assert.equal(eventoYaIniciado(inicioExacto, FECHA_REFERENCIA), true);
    });

    it('devuelve true de forma defensiva si la fecha de inicio es inválida o vacía', () => {
      assert.equal(eventoYaIniciado('', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('fecha-no-valida', FECHA_REFERENCIA), true);
    });
  });

  describe('Modal de confirmación (ModalConfirmacionCancelacion)', () => {
    it('no renderiza nada cuando abierto es false', () => {
      const html = renderToString(
        React.createElement(ModalConfirmacionCancelacion, {
          abierto: false,
          tituloEvento: 'Torneo Pádel URJC',
          onConfirmar: () => {},
          onDescartar: () => {},
        })
      );
      assert.equal(html, '');
    });

    it('renderiza el diálogo con accesibilidad, título y botones de acción cuando abierto es true', () => {
      const html = renderToString(
        React.createElement(ModalConfirmacionCancelacion, {
          abierto: true,
          tituloEvento: 'Torneo Pádel URJC',
          onConfirmar: () => {},
          onDescartar: () => {},
        })
      );
      assert.ok(html.includes('role="dialog"'), 'Debe tener role="dialog"');
      assert.ok(html.includes('aria-modal="true"'), 'Debe tener aria-modal="true"');
      assert.ok(
        html.includes('¿Deseas cancelar tu inscripción a este evento?'),
        'Debe incluir la pregunta de confirmación'
      );
      assert.ok(html.includes('Torneo Pádel URJC'), 'Debe mostrar el título del evento');
      assert.ok(html.includes('Confirmar cancelación'), 'Debe tener botón para confirmar cancelación');
      assert.ok(html.includes('Descartar'), 'Debe tener botón para descartar');
      assert.ok(html.includes('modal-dialogo'), 'Debe tener la clase modal-dialogo URJC');
      assert.ok(html.includes('boton--peligro'), 'El botón de confirmación debe tener estilo de peligro');
    });
  });

  describe('Botón de cancelación (BotonCancelarInscripcion)', () => {
    it('renderiza correctamente el botón con el texto "Cancelar inscripción"', () => {
      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_1',
          inicioIso: '2026-11-20T10:00:00.000Z',
          tituloEvento: 'Torneo Pádel URJC',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('Cancelar inscripción'), 'Debe contener el texto del botón');
      assert.ok(html.includes('boton--cancelar'), 'Debe incluir la clase boton--cancelar');
    });

    it('se renderiza inhabilitado (disabled) y con aviso explicativo si el evento ya ha comenzado', () => {
      const inicioPasado = '2026-10-18T10:00:00.000Z';
      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_1',
          inicioIso: inicioPasado,
          tituloEvento: 'Torneo Pádel URJC',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('disabled=""') || html.includes('disabled'), 'El botón debe estar disabled');
      assert.ok(html.includes('aria-disabled="true"'), 'Debe tener aria-disabled="true"');
      assert.ok(
        html.includes('No es posible cancelar una actividad ya iniciada'),
        'Debe incluir el mensaje explicativo de bloqueo'
      );
      assert.ok(html.includes('cancelar-aviso-bloqueo'), 'Debe incluir el contenedor del aviso de bloqueo');
    });

    it('se renderiza habilitado (sin disabled ni aviso de bloqueo) cuando el evento está en el futuro', () => {
      const inicioFuturo = '2026-11-25T10:00:00.000Z';
      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_1',
          inicioIso: inicioFuturo,
          tituloEvento: 'Torneo Pádel URJC',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(!html.includes('disabled=""'), 'No debe tener atributo disabled');
      assert.ok(html.includes('aria-disabled="false"'), 'Debe tener aria-disabled="false"');
      assert.ok(
        !html.includes('cancelar-aviso-bloqueo'),
        'No debe mostrar aviso de bloqueo cuando el evento es futuro'
      );
    });

    it('gestiona transiciones de estado: apertura de modal, descarte y confirmación con handler', () => {
      let llamadaCancelacion: string | null = null;
      const callbackCancelacion = (id: string) => {
        llamadaCancelacion = id;
      };

      const propsFuturo = {
        eventoId: 'evt_test_001',
        inicioIso: '2026-11-20T10:00:00.000Z',
        tituloEvento: 'Torneo Pádel URJC',
        fechaReferencia: FECHA_REFERENCIA,
        onConfirmarCancelacion: callbackCancelacion,
      };

      assert.equal(llamadaCancelacion, null);

      const modalCerrado = renderToString(
        React.createElement(ModalConfirmacionCancelacion, {
          abierto: false,
          tituloEvento: propsFuturo.tituloEvento,
          onConfirmar: () => propsFuturo.onConfirmarCancelacion('evt_test_001'),
          onDescartar: () => {},
        })
      );
      assert.equal(modalCerrado, '');
      assert.equal(llamadaCancelacion, null);

      let modalVisible = true;
      const descartar = () => {
        modalVisible = false;
      };
      descartar();
      assert.equal(modalVisible, false, 'Descartar debe cerrar el diálogo modal');
      assert.equal(llamadaCancelacion, null, 'Descartar no debe llamar a onConfirmarCancelacion');

      modalVisible = true;
      const confirmar = () => {
        modalVisible = false;
        callbackCancelacion('evt_test_001');
      };
      confirmar();
      assert.equal(modalVisible, false, 'Confirmar debe cerrar el diálogo modal');
      assert.equal(
        llamadaCancelacion,
        'evt_test_001',
        'Confirmar debe invocar onConfirmarCancelacion con el ID del evento'
      );
    });
  });

  describe('Integración en TarjetaEvento', () => {
    it('no muestra el botón de cancelar inscripción cuando el usuario no tiene reserva', () => {
      const html = renderToString(
        React.createElement(TarjetaEvento, {
          evento: EVENTO_BASE,
          tieneReserva: false,
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(!html.includes('Cancelar inscripción'), 'No debe mostrar botón de cancelar');
      assert.ok(html.includes('Reservar'), 'Debe mostrar el botón de reservar');
    });

    it('muestra el botón de cancelar inscripción cuando el usuario tiene reserva en evento futuro', () => {
      const html = renderToString(
        React.createElement(TarjetaEvento, {
          evento: EVENTO_BASE,
          tieneReserva: true,
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('Cancelar inscripción'), 'Debe mostrar el botón de cancelar inscripción');
      assert.ok(!html.includes('disabled=""'), 'Debe estar habilitado para evento futuro');
    });

    it('muestra el botón de cancelar inhabilitado cuando el usuario tiene reserva en evento ya comenzado', () => {
      const eventoPasado: Evento = {
        ...EVENTO_BASE,
        inicio: '2026-10-18T10:00:00.000Z',
        fin: '2026-10-18T12:00:00.000Z',
      };
      const html = renderToString(
        React.createElement(TarjetaEvento, {
          evento: eventoPasado,
          tieneReserva: true,
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('Cancelar inscripción'), 'Debe mostrar el botón de cancelar');
      assert.ok(html.includes('disabled'), 'Debe estar inhabilitado (disabled)');
      assert.ok(
        html.includes('No es posible cancelar una actividad ya iniciada'),
        'Debe informar al usuario del bloqueo por fecha'
      );
    });
  });
});
