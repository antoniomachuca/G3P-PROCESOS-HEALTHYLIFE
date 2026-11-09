import type { Deporte, Evento, Nivel } from './tipos';

export const NOMBRE_DEPORTE: Record<Deporte, string> = {
  futbol: 'Fútbol',
  running: 'Running',
  padel: 'Pádel',
  natacion: 'Natación',
  yoga: 'Yoga',
  ciclismo: 'Ciclismo',
};

export const DEPORTES_FILTRO: ReadonlyArray<Deporte | 'todos'> = [
  'todos',
  'padel',
  'running',
  'futbol',
  'natacion',
  'yoga',
  'ciclismo',
];

export const NOMBRE_NIVEL: Record<Nivel, string> = {
  iniciacion: 'Iniciación',
  intermedio: 'Intermedio',
  competicion: 'Competición',
};

export const NIVELES_FILTRO: ReadonlyArray<Nivel | 'todos'> = [
  'todos',
  'iniciacion',
  'intermedio',
  'competicion',
];

export const MENSAJE_SIN_EVENTOS_CATEGORIA = 'No hay eventos disponibles en esta categoría actualmente';
export const MENSAJE_SIN_EVENTOS_NIVEL =
  'No hay actividades disponibles para este nivel de exigencia actualmente. Te sugerimos restablecer los filtros.';

export type FiltrosCatalogo = {
  deporte?: Deporte | 'todos';
  consulta?: string;
  campus?: string;
  nivel?: Nivel | 'todos';
};

/**
 * alternarFiltroDeporte permite seleccionar una modalidad o desmarcar la disciplina
 * activa al volver a pulsarla, regresando a 'todos' (Criterio 2 de HU-03 / G3P-14).
 */
export function alternarFiltroDeporte(actual: Deporte | 'todos', seleccionado: Deporte | 'todos'): Deporte | 'todos' {
  if (seleccionado === 'todos') return 'todos';
  return actual === seleccionado ? 'todos' : seleccionado;
}

/**
 * alternarFiltroNivel permite seleccionar un nivel o desmarcar el nivel
 * activo al volver a pulsarlo, regresando a 'todos' (Criterio 2 de HU-04 / G3P-15).
 */
export function alternarFiltroNivel(actual: Nivel | 'todos', seleccionado: Nivel | 'todos'): Nivel | 'todos' {
  if (seleccionado === 'todos') return 'todos';
  return actual === seleccionado ? 'todos' : seleccionado;
}

/**
 * Filtra las actividades por modalidad deportiva respetando de forma combinada
 * otros filtros activos como búsqueda/campus o nivel requerido (HU-03 / G3P-14).
 */
export function filtrarEventosCatalogo(eventos: Evento[], filtros: FiltrosCatalogo = {}): Evento[] {
  const deporte = filtros.deporte ?? 'todos';
  const consulta = (filtros.consulta ?? '').toLowerCase().trim();
  const campus = (filtros.campus ?? '').toLowerCase().trim();
  const nivel = filtros.nivel ?? 'todos';

  return eventos.filter((evento) => {
    if (deporte !== 'todos' && evento.deporte !== deporte) {
      return false;
    }
    if (nivel !== 'todos' && evento.nivel !== nivel) {
      return false;
    }
    if (campus && campus !== 'todos' && evento.lugar.municipio.toLowerCase() !== campus) {
      return false;
    }
    if (consulta) {
      const texto = `${evento.titulo} ${evento.lugar.nombre} ${evento.lugar.municipio} ${evento.deporte} ${NOMBRE_DEPORTE[evento.deporte]}`.toLowerCase();
      if (!texto.includes(consulta)) {
        return false;
      }
    }
    return true;
  });
}

const ZONA = 'Europe/Madrid';
const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

// "Domingo 18 oct · 10:00 - 11:30h"
export function fechaHora(inicio: string, fin: string): string {
  const f = new Date(inicio);
  const sem = new Intl.DateTimeFormat('es-ES', { weekday: 'long', timeZone: ZONA }).format(f);
  const dia = new Intl.DateTimeFormat('es-ES', { day: 'numeric', timeZone: ZONA }).format(f);
  const mes = new Intl.DateTimeFormat('es-ES', { month: 'short', timeZone: ZONA }).format(f).replace('.', '');
  const hora = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: ZONA });
  return `${mayuscula(sem)} ${dia} ${mes} · ${hora.format(f)} - ${hora.format(new Date(fin))}h`;
}

export type EstadoPlazas = 'abierta' | 'ultimas' | 'completa';

export function estadoPlazas(plazas: number): EstadoPlazas {
  if (plazas <= 0) return 'completa';
  if (plazas <= 2) return 'ultimas';
  return 'abierta';
}

export function textoInsignia(plazas: number): string {
  const estado = estadoPlazas(plazas);
  if (estado === 'completa') return 'COMPLETA';
  if (estado === 'ultimas') return plazas === 1 ? 'ÚLTIMA PLAZA' : `ÚLTIMAS ${plazas} PLAZAS`;
  return 'ABIERTA';
}

export function textoCupo(plazas: number, total: number): string {
  if (plazas <= 0) return `Completa: 0 de ${total} plazas`;
  return plazas === 1 ? `Queda 1 de ${total} plazas` : `Quedan ${plazas} de ${total} plazas`;
}
