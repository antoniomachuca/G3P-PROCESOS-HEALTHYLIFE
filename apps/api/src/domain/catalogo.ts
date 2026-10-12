import type { Evento } from "./modelo.ts";

/**
 * Catálogo activo (HU-01): eventos abiertos que aún no han terminado,
 * ordenados cronológicamente por inicio.
 */
export function eventosActivos(eventos: Evento[], ahora: Date = new Date()): Evento[] {
  return eventos
    .filter((evento) => evento.estado === "abierta" && new Date(evento.fin).getTime() > ahora.getTime())
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
}
