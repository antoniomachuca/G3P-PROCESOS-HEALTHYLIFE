/**
 * HU-09 / G3P-80: lógica de la cancelación motivada de una actividad por su organizador.
 * Funciones puras, sin React, para poder probarlas con node:test.
 */
import type { Evento } from "./tipos";

export type ClaveMotivo = "lluvia" | "indisposicion" | "cierre_pistas" | "otro";

export const MOTIVOS_CANCELACION: ReadonlyArray<{ clave: ClaveMotivo; texto: string }> = [
  { clave: "lluvia", texto: "Lluvia o condiciones meteorológicas adversas" },
  { clave: "indisposicion", texto: "Indisposición del organizador" },
  { clave: "cierre_pistas", texto: "Cierre de las pistas o la instalación" },
  { clave: "otro", texto: "Otro motivo" },
];

export const LONGITUD_MAXIMA_DETALLE = 280;

export const MENSAJE_FALTA_MOTIVO = "Selecciona el motivo de la cancelación.";
export const MENSAJE_FALTA_DETALLE = "Describe brevemente el motivo de la cancelación.";
export const MENSAJE_DETALLE_LARGO = `El detalle no puede superar los ${LONGITUD_MAXIMA_DETALLE} caracteres.`;
export const MENSAJE_EVENTO_FINALIZADO = "La actividad ya ha finalizado y no se puede cancelar.";
export const MENSAJE_EVENTO_YA_CANCELADO = "Esta actividad ya está cancelada.";

export type ResultadoMotivo = { ok: true; motivo: string } | { ok: false; error: string };

/**
 * Compone el texto de motivo que se envía a la API.
 * Con «Otro motivo» el detalle es obligatorio; con los motivos predefinidos es opcional y se añade tras el título.
 */
export function construirMotivo(clave: ClaveMotivo | "", detalle: string): ResultadoMotivo {
  const opcion = MOTIVOS_CANCELACION.find((m) => m.clave === clave);
  if (!opcion) return { ok: false, error: MENSAJE_FALTA_MOTIVO };

  const limpio = detalle.trim();
  if (limpio.length > LONGITUD_MAXIMA_DETALLE) return { ok: false, error: MENSAJE_DETALLE_LARGO };
  if (opcion.clave === "otro") {
    return limpio ? { ok: true, motivo: limpio } : { ok: false, error: MENSAJE_FALTA_DETALLE };
  }
  return { ok: true, motivo: limpio ? `${opcion.texto}: ${limpio}` : opcion.texto };
}

/** Un evento está finalizado si su estado lo dice o si su hora de fin ya ha pasado. Fechas inválidas cuentan como finalizado. */
export function eventoFinalizado(evento: Pick<Evento, "estado" | "fin">, ahora: Date | number = Date.now()): boolean {
  if (evento.estado === "finalizada") return true;
  const finMs = Date.parse(evento.fin);
  if (!Number.isFinite(finMs)) return true;
  const ahoraMs = ahora instanceof Date ? ahora.getTime() : ahora;
  return ahoraMs >= finMs;
}

export type EstadoOpcionCancelacion = { habilitada: true } | { habilitada: false; razon: string };

/** Decide si el organizador puede pulsar «Cancelar actividad» y, si no, por qué. */
export function estadoOpcionCancelacion(
  evento: Pick<Evento, "estado" | "fin">,
  ahora: Date | number = Date.now(),
): EstadoOpcionCancelacion {
  if (evento.estado === "cancelada") return { habilitada: false, razon: MENSAJE_EVENTO_YA_CANCELADO };
  if (eventoFinalizado(evento, ahora)) return { habilitada: false, razon: MENSAJE_EVENTO_FINALIZADO };
  return { habilitada: true };
}

export function inscritosDelEvento(evento: Pick<Evento, "aforoMaximo" | "plazasDisponibles">): number {
  return Math.max(0, evento.aforoMaximo - evento.plazasDisponibles);
}
