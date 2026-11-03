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

/**
 * Mis actividades (HU-17): de los eventos en los que el usuario tiene reserva confirmada,
 * deja los abiertos cuyo fin aún no ha pasado, ordenados cronológicamente por inicio.
 * Los que ya han terminado salen del listado (el histórico es HU-21).
 */
export function actividadesProximas(eventosConfirmados: Evento[], ahora: Date = new Date()): Evento[] {
  return eventosActivos(eventosConfirmados, ahora);
}
