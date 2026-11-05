import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  NIVELES_FILTRO,
  MENSAJE_SIN_EVENTOS_NIVEL,
  NOMBRE_NIVEL,
  alternarFiltroNivel,
  filtrarEventosCatalogo,
} from '../src/formato';
import { CatalogoEventos } from '../src/components/CatalogoEventos';
import type { Evento } from '../src/tipos';

const EVENTOS_PRUEBA_NIVEL: Evento[] = [
  {
    id: 'evt_iniciacion_1',
    titulo: 'Pádel de iniciación en el campus',
    deporte: 'padel',
    nivel: 'iniciacion',
    descripcion: 'Sesión de iniciación al pádel',
    inicio: '2026-11-20T10:00:00+01:00',
    fin: '2026-11-20T11:30:00+01:00',
    lugar: {
      nombre: 'Pistas de pádel',
      puntoEncuentro: 'Entrada del pabellón',
      municipio: 'Alcorcón',
      direccion: 'Campus de Alcorcón',
      lat: 40.34,
      lng: -3.82,
    },
    aforoMaximo: 8,
    plazasDisponibles: 3,
    material: ['Pala'],
    estado: 'abierta',
    organizadorId: 'usr_mock_001',
    communityGroupId: null,
    routineId: null,
  },
  {
    id: 'evt_intermedio_1',
    titulo: 'Running intermedio por el campus',
    deporte: 'running',
    nivel: 'intermedio',
    descripcion: 'Salida grupal a ritmo constante',
    inicio: '2026-11-22T09:00:00+01:00',
    fin: '2026-11-22T10:00:00+01:00',
    lugar: {
      nombre: 'Campus de Móstoles',
      puntoEncuentro: 'Puerta principal',
      municipio: 'Móstoles',
      direccion: 'Campus de Móstoles',
      lat: 40.33,
      lng: -3.87,
    },
    aforoMaximo: 20,
    plazasDisponibles: 5,
    material: ['Zapatillas'],
    estado: 'abierta',
    organizadorId: 'usr_mock_002',
    communityGroupId: null,
    routineId: null,
  },
  {
    id: 'evt_competicion_1',
    titulo: 'Torneo relámpago de pádel',
    deporte: 'padel',
    nivel: 'competicion',
    descripcion: 'Torneo avanzado de eliminatoria',
    inicio: '2026-11-21T18:00:00+01:00',
    fin: '2026-11-21T20:00:00+01:00',
    lugar: {
      nombre: 'Pistas centrales',
      puntoEncuentro: 'Entrada pistas',
      municipio: 'Fuenlabrada',
      direccion: 'Campus de Fuenlabrada',
      lat: 40.28,
      lng: -3.82,
    },
    aforoMaximo: 16,
    plazasDisponibles: 6,
    material: ['Pala'],
    estado: 'abierta',
    organizadorId: 'usr_mock_002',
    communityGroupId: null,
    routineId: null,
  },
];

describe('HU-04 / G3P-15: Filtrado por nivel de exigencia o condición física', () => {
  it('incluye únicamente los niveles oficiales estables de AGENTS.md más la opción Todos', () => {
    assert.deepEqual(NIVELES_FILTRO, ['todos', 'iniciacion', 'intermedio', 'competicion']);
    assert.equal(NOMBRE_NIVEL.iniciacion, 'Iniciación');
    assert.equal(NOMBRE_NIVEL.intermedio, 'Intermedio');
    assert.equal(NOMBRE_NIVEL.competicion, 'Competición');
  });

  it('Criterio 1: al seleccionar un nivel concreto, muestra únicamente las sesiones de dicho nivel', () => {
    const iniciacion = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, { nivel: 'iniciacion' });
    assert.equal(iniciacion.length, 1);
    assert.equal(iniciacion[0].id, 'evt_iniciacion_1');
    assert.equal(iniciacion[0].nivel, 'iniciacion');

    const intermedio = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, { nivel: 'intermedio' });
    assert.equal(intermedio.length, 1);
    assert.equal(intermedio[0].id, 'evt_intermedio_1');
    assert.equal(intermedio[0].nivel, 'intermedio');

    const competicion = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, { nivel: 'competicion' });
    assert.equal(competicion.length, 1);
    assert.equal(competicion[0].id, 'evt_competicion_1');
    assert.equal(competicion[0].nivel, 'competicion');
  });

  it('Criterio 2: al seleccionar ver todos los niveles o desmarcar el filtro activo, vuelve a mostrar todas las actividades', () => {
    // Alternar nivel: de 'todos' a 'iniciacion'
    assert.equal(alternarFiltroNivel('todos', 'iniciacion'), 'iniciacion');
    // Desmarcar: volver a pulsar el nivel activo regresa a 'todos'
    assert.equal(alternarFiltroNivel('iniciacion', 'iniciacion'), 'todos');
    // Seleccionar explícitamente 'todos' regresa a 'todos'
    assert.equal(alternarFiltroNivel('iniciacion', 'todos'), 'todos');

    const todos = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, { nivel: 'todos' });
    assert.equal(todos.length, EVENTOS_PRUEBA_NIVEL.length);
  });

  it('Criterio 3: cuando no existen actividades para el nivel seleccionado, muestra mensaje informativo de estado vacío sugiriendo restablecer', () => {
    const html = renderToString(
      React.createElement(CatalogoEventos, {
        eventosIniciales: EVENTOS_PRUEBA_NIVEL,
        deporteInicial: 'running',
        nivelInicial: 'iniciacion', // No hay running de iniciación en los eventos de prueba
      }),
    );

    assert.ok(
      html.includes(MENSAJE_SIN_EVENTOS_NIVEL),
      `Debe mostrar el mensaje informativo de estado vacío de nivel: "${MENSAJE_SIN_EVENTOS_NIVEL}"`,
    );
    assert.ok(
      html.includes('Ver todos los niveles'),
      'Debe ofrecer opción de ver todos los niveles',
    );
    assert.ok(
      html.includes('Restablecer todos los filtros'),
      'Debe sugerir y ofrecer botón para restablecer filtros',
    );
  });

  it('Criterio 4: el filtrado por nivel opera de forma acumulativa respetando deporte, campus o búsqueda activa', () => {
    // Deporte padel + nivel iniciacion -> evt_iniciacion_1
    const padelIniciacion = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, {
      deporte: 'padel',
      nivel: 'iniciacion',
    });
    assert.equal(padelIniciacion.length, 1);
    assert.equal(padelIniciacion[0].id, 'evt_iniciacion_1');

    // Deporte padel + nivel competicion -> evt_competicion_1
    const padelCompeticion = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, {
      deporte: 'padel',
      nivel: 'competicion',
    });
    assert.equal(padelCompeticion.length, 1);
    assert.equal(padelCompeticion[0].id, 'evt_competicion_1');

    // Deporte running + nivel competicion -> 0 (no hay)
    const runningCompeticion = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, {
      deporte: 'running',
      nivel: 'competicion',
    });
    assert.equal(runningCompeticion.length, 0);

    // Nivel intermedio + búsqueda por campus "Móstoles" -> evt_intermedio_1
    const intermedioMostoles = filtrarEventosCatalogo(EVENTOS_PRUEBA_NIVEL, {
      nivel: 'intermedio',
      consulta: 'Móstoles',
    });
    assert.equal(intermedioMostoles.length, 1);
    assert.equal(intermedioMostoles[0].id, 'evt_intermedio_1');
  });

  it('renderiza la botonera de niveles con identidad URJC y atributos de accesibilidad aria-pressed', () => {
    const html = renderToString(
      React.createElement(CatalogoEventos, {
        eventosIniciales: EVENTOS_PRUEBA_NIVEL,
        nivelInicial: 'iniciacion',
      }),
    );

    assert.ok(html.includes('aria-label="Filtrar por nivel de exigencia"'), 'Debe existir el grupo de nivel con su label');
    assert.ok(html.includes('Iniciación'), 'Debe mostrar la etiqueta Iniciación');
    assert.ok(html.includes('Intermedio'), 'Debe mostrar la etiqueta Intermedio');
    assert.ok(html.includes('Competición'), 'Debe mostrar la etiqueta Competición');
    assert.ok(html.includes('Todos los niveles'), 'Debe mostrar la opción Todos los niveles');
    assert.ok(html.includes('aria-pressed="true"'), 'Debe marcar aria-pressed en el nivel activo');
  });
});

