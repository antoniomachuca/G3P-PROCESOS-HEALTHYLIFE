/**
 * Funciones de utilidad para la lógica de cancelación de inscripciones (HU-13 / G3P-59).
 */

/**
 * Comprueba si una actividad ya ha alcanzado su hora de inicio con respecto
 * a una fecha/hora de referencia (por defecto Date.now()).
 *
 * Si la fecha del evento no es válida o es anterior o igual a la actual,
 * devuelve true indicando que el evento ya ha comenzado y por tanto la
 * cancelación debe inhabilitarse.
 *
 * @param inicioIso Cadena ISO-8601 con la fecha/hora de inicio del evento.
 * @param fechaReferencia Fecha o timestamp de referencia (útil para pruebas).
 * @returns true si el evento ya ha comenzado, false si está en el futuro.
 */
export function eventoYaIniciado(
  inicioIso: string,
  fechaReferencia: Date | number = Date.now()
): boolean {
  if (!inicioIso) return true;
  const inicioMs = Date.parse(inicioIso);
  if (!Number.isFinite(inicioMs)) return true;

  const ahoraMs =
    fechaReferencia instanceof Date ? fechaReferencia.getTime() : fechaReferencia;

  return ahoraMs >= inicioMs;
}
