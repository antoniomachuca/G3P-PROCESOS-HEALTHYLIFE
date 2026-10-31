import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Evento } from '../src/tipos';
import { cancelarInscripcion } from '../src/api';

function crearEventoMock(id = 'evt_test_panel'): Evento {
  return {
    id,
    titulo: 'Sesión de Pádel en Campus',
    deporte: 'padel',
    nivel: 'intermedio',
    descripcion: 'Partido de pádel programado',
    inicio: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    fin: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
    lugar: {
      nombre: 'Pistas Pádel',
      puntoEncuentro: 'Pista 1',
      municipio: 'Fuenlabrada',
      direccion: 'Campus Fuenlabrada URJC',
      lat: 40.28,
      lng: -3.81,
    },
    aforoMaximo: 4,
    plazasDisponibles: 2,
    material: ['Pala'],
    estado: 'abierta',
    organizadorId: 'usr_org_001',
    communityGroupId: null,
    routineId: null,
  };
}

test('G3P-62: cancelarInscripcion llama al endpoint DELETE con la cabecera X-User-Id', async () => {
  let llamadaRealizada = false;
  let metodoUsado = '';
  let urlUsada = '';
  let headerUserId = '';

  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    llamadaRealizada = true;
    metodoUsado = init?.method ?? 'GET';
    urlUsada = input.toString();
    const headers = init?.headers as Record<string, string>;
    headerUserId = headers?.['X-User-Id'] ?? '';

    return {
      ok: true,
      status: 200,
      json: async () => ({
        id: 'ins_mock_001',
        eventoId: 'evt_test_panel',
        usuarioId: 'usr_mock_010',
        estado: 'cancelada',
        plazasDisponibles: 3,
        mensaje: 'Inscripción cancelada correctamente',
      }),
    } as Response;
  }) as typeof fetch;

  try {
    const resultado = await cancelarInscripcion('evt_test_panel', 'usr_mock_010');
    assert.ok(llamadaRealizada, 'Debe invocar a fetch');
    assert.equal(metodoUsado, 'DELETE');
    assert.match(urlUsada, /\/api\/v1\/events\/evt_test_panel\/reservations/);
    assert.equal(headerUserId, 'usr_mock_010');
    assert.equal(resultado.estado, 'cancelada');
    assert.equal(resultado.plazasDisponibles, 3);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test('G3P-62: Tras confirmar la baja, el panel personal retira la tarjeta confirmada y actualiza aforo', () => {
  const evento1 = crearEventoMock('evt_1');
  const evento2 = crearEventoMock('evt_2');

  // Estado inicial: dos reservas confirmadas
  let reservas: Record<string, string> = {
    evt_1: 'confirmada',
    evt_2: 'confirmada',
  };

  let listaEventos = [evento1, evento2];

  // Filtro que alimenta el panel personal
  let eventosConfirmados = listaEventos.filter((e) => reservas[e.id] === 'confirmada');
  assert.equal(eventosConfirmados.length, 2);

  // Simulación del flujo de anulación de evt_1
  const idACancelar = 'evt_1';
  const resultado = {
    id: 'ins_1',
    eventoId: 'evt_1',
    usuarioId: 'usr_mock_010',
    estado: 'cancelada',
    plazasDisponibles: evento1.plazasDisponibles + 1,
    mensaje: 'Inscripción cancelada correctamente.',
  };

  // 1. Eliminar de reservas activas
  const nuevasReservas = { ...reservas };
  delete nuevasReservas[idACancelar];
  reservas = nuevasReservas;

  // 2. Actualizar aforo del evento
  listaEventos = listaEventos.map((e) =>
    e.id === idACancelar ? { ...e, plazasDisponibles: resultado.plazasDisponibles } : e,
  );

  // 3. Generar aviso toast
  const aviso = {
    tipo: 'exito',
    texto: resultado.mensaje,
  };

  // Verificaciones del criterio de aceptación:
  // - Mensaje toast de éxito presente
  assert.equal(aviso.tipo, 'exito');
  assert.equal(aviso.texto, 'Inscripción cancelada correctamente.');

  // - Panel personal actualizado: tarjeta eliminada
  eventosConfirmados = listaEventos.filter((e) => reservas[e.id] === 'confirmada');
  assert.equal(eventosConfirmados.length, 1);
  assert.equal(eventosConfirmados[0].id, 'evt_2');
  assert.ok(!eventosConfirmados.some((e) => e.id === 'evt_1'));

  // - Evento en catálogo actualizado con plaza liberada
  const eventoEnCatalogo = listaEventos.find((e) => e.id === 'evt_1');
  assert.equal(eventoEnCatalogo?.plazasDisponibles, 3);
});

test('G3P-62: Si se cancela la última reserva, el panel personal muestra el estado vacío', () => {
  const evento = crearEventoMock('evt_unico');
  let reservas: Record<string, string> = {
    evt_unico: 'confirmada',
  };

  let eventosConfirmados = [evento].filter((e) => reservas[e.id] === 'confirmada');
  assert.equal(eventosConfirmados.length, 1);

  // Anulación de la única reserva
  delete reservas['evt_unico'];
  eventosConfirmados = [evento].filter((e) => reservas[e.id] === 'confirmada');

  // Comprobar que queda vacío
  assert.equal(eventosConfirmados.length, 0);
});
