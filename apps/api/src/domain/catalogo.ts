import { DEPORTES, NIVELES, type Deporte, type Evento, type Nivel } from "./modelo.ts";

export type CriteriosFiltroCatalogo = {
  deporte?: string | null;
  nivel?: string | null;
  campus?: string | null;
};

export function esDeporteValido(valor: string): valor is Deporte {
  return (DEPORTES as readonly string[]).includes(valor);
}

export function esNivelValido(valor: string): valor is Nivel {
  return (NIVELES as readonly string[]).includes(valor);
}

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

/**
 * Filtra los eventos del catálogo por modalidad deportiva y de forma combinada
 * con otros criterios activos como campus/municipio o nivel requerido (HU-03 / G3P-14).
 */
export function filtrarCatalogo(eventos: Evento[], criterios: CriteriosFiltroCatalogo = {}): Evento[] {
  const deporte = criterios.deporte?.trim().toLowerCase() ?? "";
  const nivel = criterios.nivel?.trim().toLowerCase() ?? "";
  const campus = criterios.campus?.trim().toLowerCase() ?? "";

  return eventos.filter((evento) => {
    if (deporte && deporte !== "todos" && evento.deporte !== deporte) {
      return false;
    }
    if (nivel && nivel !== "todos" && evento.nivel !== nivel) {
      return false;
    }
    if (campus && campus !== "todos" && evento.lugar.municipio.toLowerCase() !== campus) {
      return false;
    }
    return true;
  });
}
