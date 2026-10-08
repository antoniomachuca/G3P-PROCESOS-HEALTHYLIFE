import type { Deporte } from './tipos';

export const NOMBRE_DEPORTE: Record<Deporte, string> = {
  futbol: 'Fútbol',
  running: 'Running',
  padel: 'Pádel',
  natacion: 'Natación',
  yoga: 'Yoga',
  ciclismo: 'Ciclismo',
};

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
