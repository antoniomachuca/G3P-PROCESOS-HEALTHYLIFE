import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { eventoYaIniciado } from '../src/cancelacion';
import { BotonCancelarInscripcion } from '../src/components/BotonCancelarInscripcion';

describe('CHALLENGER STRESS SUITE: G3P-59 Lógica de comparación de fechas y bloqueo', () => {
  const BASE_TIMESTAMP = Date.parse('2026-10-31T12:00:00.000Z');
  const FECHA_REFERENCIA = new Date(BASE_TIMESTAMP);

  // --------------------------------------------------------------------------
  // 1. Stress Test: Precision a nivel de milisegundos y horizontes temporales
  // --------------------------------------------------------------------------
  describe('1. Precision temporal (milisegundos, horas y dias)', () => {
    it('1 ms en el futuro: debe devolver false y habilitar el boton', () => {
      const inicioMs = BASE_TIMESTAMP + 1;
      const inicioIso = new Date(inicioMs).toISOString();

      assert.equal(eventoYaIniciado(inicioIso, FECHA_REFERENCIA), false);
      assert.equal(eventoYaIniciado(inicioIso, BASE_TIMESTAMP), false);

      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_stress_01',
          inicioIso,
          tituloEvento: 'Evento 1ms futuro',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(!html.includes('disabled=""'), 'No debe tener atributo disabled');
      assert.ok(html.includes('aria-disabled="false"'), 'aria-disabled debe ser false');
      assert.ok(!html.includes('cancelar-aviso-bloqueo'), 'No debe mostrar aviso de bloqueo');
    });

    it('Exacto inicio (now === inicio): debe devolver true e inhabilitar el boton', () => {
      const inicioIso = new Date(BASE_TIMESTAMP).toISOString();

      assert.equal(eventoYaIniciado(inicioIso, FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado(inicioIso, BASE_TIMESTAMP), true);

      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_stress_02',
          inicioIso,
          tituloEvento: 'Evento exacto',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('disabled'), 'El boton debe tener disabled');
      assert.ok(html.includes('aria-disabled="true"'), 'aria-disabled debe ser true');
      assert.ok(html.includes('cancelar-aviso-bloqueo'), 'Debe mostrar aviso de bloqueo');
      assert.ok(html.includes('No es posible cancelar una actividad ya iniciada'));
    });

    it('1 ms en el pasado: debe devolver true e inhabilitar el boton', () => {
      const inicioMs = BASE_TIMESTAMP - 1;
      const inicioIso = new Date(inicioMs).toISOString();

      assert.equal(eventoYaIniciado(inicioIso, FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado(inicioIso, BASE_TIMESTAMP), true);

      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_stress_03',
          inicioIso,
          tituloEvento: 'Evento 1ms pasado',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('disabled'), 'El boton debe tener disabled');
      assert.ok(html.includes('aria-disabled="true"'), 'aria-disabled debe ser true');
      assert.ok(html.includes('cancelar-aviso-bloqueo'), 'Debe mostrar aviso de bloqueo');
    });

    it('1 hora en el futuro (+3.600.000 ms): debe devolver false y boton habilitado', () => {
      const inicioIso = new Date(BASE_TIMESTAMP + 3600000).toISOString();
      assert.equal(eventoYaIniciado(inicioIso, FECHA_REFERENCIA), false);
    });

    it('1 hora en el pasado (-3.600.000 ms): debe devolver true y boton inhabilitado', () => {
      const inicioIso = new Date(BASE_TIMESTAMP - 3600000).toISOString();
      assert.equal(eventoYaIniciado(inicioIso, FECHA_REFERENCIA), true);
    });

    it('10 dias en el futuro (+864.000.000 ms): debe devolver false y boton habilitado', () => {
      const inicioIso = new Date(BASE_TIMESTAMP + 10 * 86400000).toISOString();
      assert.equal(eventoYaIniciado(inicioIso, FECHA_REFERENCIA), false);
    });

    it('10 dias en el pasado (-864.000.000 ms): debe devolver true y boton inhabilitado', () => {
      const inicioIso = new Date(BASE_TIMESTAMP - 10 * 86400000).toISOString();
      assert.equal(eventoYaIniciado(inicioIso, FECHA_REFERENCIA), true);
    });

    it('1 ano en el futuro: false; 1 ano en el pasado: true', () => {
      const inicioFuturo = new Date(BASE_TIMESTAMP + 365 * 86400000).toISOString();
      const inicioPasado = new Date(BASE_TIMESTAMP - 365 * 86400000).toISOString();
      assert.equal(eventoYaIniciado(inicioFuturo, FECHA_REFERENCIA), false);
      assert.equal(eventoYaIniciado(inicioPasado, FECHA_REFERENCIA), true);
    });
  });

  // --------------------------------------------------------------------------
  // 2. Stress Test: Zonas horarias y formatos ISO-8601
  // --------------------------------------------------------------------------
  describe('2. Zonas horarias y formatos ISO-8601', () => {
    // Referencia fija: 2026-10-31T12:00:00.000Z
    it('Formato UTC "Z" sin milisegundos vs con milisegundos', () => {
      assert.equal(eventoYaIniciado('2026-10-31T12:00:00Z', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('2026-10-31T12:00:00.000Z', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('2026-10-31T12:00:00.001Z', FECHA_REFERENCIA), false);
      assert.equal(eventoYaIniciado('2026-10-31T11:59:59.999Z', FECHA_REFERENCIA), true);
    });

    it('Offset positivo +02:00 (Madrid CEST / horario de verano)', () => {
      // 14:00:00+02:00 equivale exactamente a 12:00:00Z
      const exactoMadrid = '2026-10-31T14:00:00+02:00';
      assert.equal(Date.parse(exactoMadrid), BASE_TIMESTAMP);
      assert.equal(eventoYaIniciado(exactoMadrid, FECHA_REFERENCIA), true);

      // 14:00:00.001+02:00 (1ms futuro)
      const futuroMadrid = '2026-10-31T14:00:00.001+02:00';
      assert.equal(eventoYaIniciado(futuroMadrid, FECHA_REFERENCIA), false);

      // 13:59:59.999+02:00 (1ms pasado)
      const pasadoMadrid = '2026-10-31T13:59:59.999+02:00';
      assert.equal(eventoYaIniciado(pasadoMadrid, FECHA_REFERENCIA), true);
    });

    it('Offset negativo -05:00 (America/New York EST)', () => {
      // 07:00:00-05:00 equivale a 12:00:00Z
      const exactoNY = '2026-10-31T07:00:00-05:00';
      assert.equal(Date.parse(exactoNY), BASE_TIMESTAMP);
      assert.equal(eventoYaIniciado(exactoNY, FECHA_REFERENCIA), true);

      // 07:00:01-05:00 (1 segundo en el futuro)
      const futuroNY = '2026-10-31T07:00:01-05:00';
      assert.equal(eventoYaIniciado(futuroNY, FECHA_REFERENCIA), false);

      // 06:59:59-05:00 (1 segundo en el pasado)
      const pasadoNY = '2026-10-31T06:59:59-05:00';
      assert.equal(eventoYaIniciado(pasadoNY, FECHA_REFERENCIA), true);
    });

    it('Offset no entero +05:30 (India IST) y -03:30 (Terranova NST)', () => {
      // 17:30:00+05:30 equivale a 12:00:00Z
      const exactoIndia = '2026-10-31T17:30:00+05:30';
      assert.equal(Date.parse(exactoIndia), BASE_TIMESTAMP);
      assert.equal(eventoYaIniciado(exactoIndia, FECHA_REFERENCIA), true);

      // 08:30:00-03:30 equivale a 12:00:00Z
      const exactoTerranova = '2026-10-31T08:30:00-03:30';
      assert.equal(Date.parse(exactoTerranova), BASE_TIMESTAMP);
      assert.equal(eventoYaIniciado(exactoTerranova, FECHA_REFERENCIA), true);
    });

    it('Offset explicito +00:00 y -00:00', () => {
      assert.equal(eventoYaIniciado('2026-10-31T12:00:00+00:00', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('2026-10-31T12:00:01+00:00', FECHA_REFERENCIA), false);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Stress Test: Ciclo de vida y limites del evento (inicio vs fin)
  // --------------------------------------------------------------------------
  describe('3. Ciclo de vida del evento (ahora frente a inicio y fin)', () => {
    const INICIO_EVENTO = '2026-11-20T10:00:00.000Z';
    const FIN_EVENTO = '2026-11-20T12:00:00.000Z';
    const inicioMs = Date.parse(INICIO_EVENTO);
    const finMs = Date.parse(FIN_EVENTO);

    it('Antes del inicio (now < inicio): boton habilitado', () => {
      const ahora = new Date(inicioMs - 1000);
      assert.equal(eventoYaIniciado(INICIO_EVENTO, ahora), false);
    });

    it('En el inicio exacto (now === inicio): boton inhabilitado', () => {
      const ahora = new Date(inicioMs);
      assert.equal(eventoYaIniciado(INICIO_EVENTO, ahora), true);
    });

    it('Durante la realizacion del evento (inicio < now < fin): boton inhabilitado', () => {
      const ahora = new Date(inicioMs + 3600000); // 11:00:00
      assert.equal(eventoYaIniciado(INICIO_EVENTO, ahora), true);
    });

    it('En el fin exacto (now === fin): boton inhabilitado', () => {
      const ahora = new Date(finMs);
      assert.equal(eventoYaIniciado(INICIO_EVENTO, ahora), true);
    });

    it('Posterior al fin (now > fin): boton inhabilitado', () => {
      const ahora = new Date(finMs + 10000);
      assert.equal(eventoYaIniciado(INICIO_EVENTO, ahora), true);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Stress Test: Entradas degradadas, invalidas o defensivas
  // --------------------------------------------------------------------------
  describe('4. Entradas anomalas y defensivas', () => {
    it('Cadena vacia o con espacios en blanco', () => {
      assert.equal(eventoYaIniciado('', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('   ', FECHA_REFERENCIA), true);
    });

    it('Cadenas de texto no parseables', () => {
      assert.equal(eventoYaIniciado('texto-aleatorio', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('undefined', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('null', FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado('2026-99-99T99:99:99Z', FECHA_REFERENCIA), true);
    });

    it('Tipos no previstos (defensiva ante undefined o null en runtime JS)', () => {
      assert.equal(eventoYaIniciado(undefined as unknown as string, FECHA_REFERENCIA), true);
      assert.equal(eventoYaIniciado(null as unknown as string, FECHA_REFERENCIA), true);
    });

    it('fechaReferencia como timestamp numerico vs Date object', () => {
      const isoFuturo = '2026-11-01T00:00:00.000Z';
      const numRef = BASE_TIMESTAMP;
      const dateRef = new Date(BASE_TIMESTAMP);
      assert.equal(eventoYaIniciado(isoFuturo, numRef), false);
      assert.equal(eventoYaIniciado(isoFuturo, dateRef), false);
    });

    it('fechaReferencia por defecto (sin argumento) usa Date.now()', () => {
      const futuroLejano = new Date(Date.now() + 100000000).toISOString();
      const pasadoLejano = new Date(Date.now() - 100000000).toISOString();
      assert.equal(eventoYaIniciado(futuroLejano), false);
      assert.equal(eventoYaIniciado(pasadoLejano), true);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Stress Test: Renderizado del componente BotonCancelarInscripcion
  // --------------------------------------------------------------------------
  describe('5. Componente BotonCancelarInscripcion con estados frontera', () => {
    it('Renderiza boton habilitado cuando inicio es 1 segundo en el futuro', () => {
      const inicioFuturo = new Date(BASE_TIMESTAMP + 1000).toISOString();
      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_futuro',
          inicioIso: inicioFuturo,
          tituloEvento: 'Entrenamiento Futuro',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('Cancelar inscripción'));
      assert.ok(!html.includes('disabled=""'));
      assert.ok(html.includes('aria-disabled="false"'));
      assert.ok(!html.includes('cancelar-aviso-bloqueo'));
    });

    it('Renderiza boton inhabilitado y mensaje de bloqueo cuando inicio coincide con now', () => {
      const inicioExacto = new Date(BASE_TIMESTAMP).toISOString();
      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_exacto',
          inicioIso: inicioExacto,
          tituloEvento: 'Entrenamiento Exacto',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('disabled'));
      assert.ok(html.includes('aria-disabled="true"'));
      assert.ok(html.includes('cancelar-aviso-bloqueo'));
      assert.ok(html.includes('No es posible cancelar una actividad ya iniciada'));
      assert.ok(html.includes('title="No es posible cancelar una actividad ya iniciada"'));
    });

    it('Renderiza boton inhabilitado cuando inicio es invalido (defensa ante corrupcion de datos)', () => {
      const html = renderToString(
        React.createElement(BotonCancelarInscripcion, {
          eventoId: 'evt_corrupto',
          inicioIso: 'fecha-corrupta',
          tituloEvento: 'Entrenamiento Corrupto',
          fechaReferencia: FECHA_REFERENCIA,
        })
      );
      assert.ok(html.includes('disabled'));
      assert.ok(html.includes('aria-disabled="true"'));
      assert.ok(html.includes('cancelar-aviso-bloqueo'));
    });
  });
});
