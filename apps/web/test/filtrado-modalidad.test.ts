import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  DEPORTES_FILTRO,
  MENSAJE_SIN_EVENTOS_CATEGORIA,
  alternarFiltroDeporte,
  filtrarEventosCatalogo,
} from '../src/formato';
import { CatalogoEventos } from '../src/components/CatalogoEventos';
import type { Evento } from '../src/tipos';

const EVENTOS_PRUEBA: Evento[] = [
  {
    id: 'evt_padel_1',
    titulo: 'Pádel de iniciación en el campus',
    deporte: 'padel',
    nivel: 'iniciacion',
    descripcion: 'Sesión de iniciación',
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
    id: 'evt_padel_2',
    titulo: 'Torneo relámpago de pádel',
    deporte: 'padel',
    nivel: 'competicion',
    descripcion: 'Torneo de dobles',
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
  {
    id: 'evt_running_1',
    titulo: 'Running por el campus',
    deporte: 'running',
    nivel: 'intermedio',
    descripcion: 'Salida grupal de 6 km',
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
];

describe('HU-03 / G3P-14: Filtrado de actividades por modalidad deportiva', () => {
  it('incluye únicamente los deportes oficiales estables de AGENTS.md más la opción Todos', () => {
    assert.deepEqual(DEPORTES_FILTRO, [
      'todos',
      'padel',
      'running',
      'futbol',
      'natacion',
      'yoga',
      'ciclismo',
    ]);
  });

  it('Criterio 1: al seleccionar una disciplina como Pádel, lista únicamente los eventos de ese deporte', () => {
    const resultado = filtrarEventosCatalogo(EVENTOS_PRUEBA, { deporte: 'padel' });
    assert.equal(resultado.length, 2);
    assert.ok(resultado.every((e) => e.deporte === 'padel'));
    assert.deepEqual(
      resultado.map((e) => e.id),
      ['evt_padel_1', 'evt_padel_2'],
    );
  });

  it('Criterio 2: al seleccionar Todos o desmarcar la disciplina activa, vuelve a mostrar todas las modalidades', () => {
    assert.equal(alternarFiltroDeporte('todos', 'padel'), 'padel');
    // Volver a pulsar la disciplina activa la desmarca y regresa a 'todos'
    assert.equal(alternarFiltroDeporte('padel', 'padel'), 'todos');
    // Seleccionar explícitamente 'todos' regresa a 'todos'
    assert.equal(alternarFiltroDeporte('padel', 'todos'), 'todos');

    const todos = filtrarEventosCatalogo(EVENTOS_PRUEBA, { deporte: 'todos' });
    assert.equal(todos.length, EVENTOS_PRUEBA.length);
  });

  it('Criterio 3: cuando no hay actividades para la categoría seleccionada (ej. yoga), muestra el mensaje oficial en español', () => {
    const html = renderToString(
      React.createElement(CatalogoEventos, {
        eventosIniciales: EVENTOS_PRUEBA,
        deporteInicial: 'yoga',
      }),
    );

    assert.ok(
      html.includes(MENSAJE_SIN_EVENTOS_CATEGORIA),
      `Debe mostrar el mensaje exacto: "${MENSAJE_SIN_EVENTOS_CATEGORIA}"`,
    );
    assert.ok(
      html.includes('Ver todos los deportes'),
      'Debe ofrecer botón para restablecer el filtro en estado vacío',
    );
  });

  it('Criterio 4: opera de forma combinada respetando otros filtros activos (campus, nivel o consulta)', () => {
    const porDeporteYCampus = filtrarEventosCatalogo(EVENTOS_PRUEBA, {
      deporte: 'padel',
      campus: 'Alcorcón',
    });
    assert.equal(porDeporteYCampus.length, 1);
    assert.equal(porDeporteYCampus[0].id, 'evt_padel_1');

    const porDeporteYNivel = filtrarEventosCatalogo(EVENTOS_PRUEBA, {
      deporte: 'padel',
      nivel: 'competicion',
    });
    assert.equal(porDeporteYNivel.length, 1);
    assert.equal(porDeporteYNivel[0].id, 'evt_padel_2');

    const porDeporteYConsulta = filtrarEventosCatalogo(EVENTOS_PRUEBA, {
      deporte: 'padel',
      consulta: 'Fuenlabrada',
    });
    assert.equal(porDeporteYConsulta.length, 1);
    assert.equal(porDeporteYConsulta[0].id, 'evt_padel_2');
  });

  it('renderiza la botonera con la clase activa URJC y atributos de accesibilidad aria-pressed', () => {
    const html = renderToString(
      React.createElement(CatalogoEventos, {
        eventosIniciales: EVENTOS_PRUEBA,
        deporteInicial: 'padel',
      }),
    );

    assert.ok(html.includes('class="filtro filtro--activo"'), 'Debe marcar el botón activo con filtro--activo');
    assert.ok(html.includes('aria-pressed="true"'), 'Debe indicar aria-pressed="true" en el filtro activo');
    assert.ok(html.includes('Pádel de iniciación en el campus'), 'Debe mostrar evento de pádel');
    assert.ok(!html.includes('Running por el campus'), 'No debe mostrar evento de running cuando filtra por pádel');
  });
});
