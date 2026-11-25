export const DEPORTES = ["futbol", "running", "padel", "natacion", "yoga", "ciclismo"] as const;
export const NIVELES = ["iniciacion", "intermedio", "competicion"] as const;
export const ESTADOS_EVENTO = ["abierta", "cancelada", "finalizada"] as const;
export const ESTADOS_RESERVA = ["confirmada", "en_espera", "cancelada", "asistida", "no_presentado"] as const;

export type Deporte = (typeof DEPORTES)[number];
export type Nivel = (typeof NIVELES)[number];
export type EstadoEvento = (typeof ESTADOS_EVENTO)[number];
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

export type Lugar = {
  nombre: string;
  puntoEncuentro: string;
  municipio: string;
  direccion: string;
  lat: number;
  lng: number;
};

/** Forma pública del contrato (contracts/eventos.ejemplo.json). En SQLite, aforoMaximo es capacidad y plazasDisponibles es plazas_libres. */
export type Evento = {
  id: string;
  titulo: string;
  deporte: Deporte;
  nivel: Nivel;
  descripcion: string;
  inicio: string;
  fin: string;
  lugar: Lugar;
  aforoMaximo: number;
  plazasDisponibles: number;
  /** Cupo mínimo opcional de asistentes para garantizar la viabilidad del evento (HU-11). */
  aforoMinimo?: number | null;
  /** Fecha y hora límite ISO-8601 con offset para inscripciones previas (HU-11). */
  fechaLimiteInscripcion?: string | null;
  material: string[];
  estado: EstadoEvento;
  organizadorId: string;
  communityGroupId: string | null;
  routineId: string | null;
  /** Ruta o URL de la imagen del evento. Si falta, la interfaz muestra un hueco gris. */
  imagenUrl?: string | null;
};

/** ISO-8601 con offset obligatorio (p. ej. 2026-10-18T10:00:00+02:00 o Z). */
export const ISO_CON_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:\d{2}|Z)$/;

/**
 * HU-11 / G3P-98: comprueba si el reloj ha alcanzado o superado la hora límite de inscripción fijada.
 * Cuando es true, el evento queda cerrado a nuevas inscripciones y a cancelaciones directas.
 */
export function inscripcionCerradaPorLimite(
  evento: Pick<Evento, "fechaLimiteInscripcion">,
  ahora: Date = new Date(),
): boolean {
  if (!evento.fechaLimiteInscripcion) {
    return false;
  }
  const limiteMs = Date.parse(evento.fechaLimiteInscripcion);
  return Number.isFinite(limiteMs) && ahora.getTime() >= limiteMs;
}

export type Reserva = {
  id: string;
  eventoId: string;
  usuarioId: string;
  estado: EstadoReserva;
  creadaEn: string;
};

export type CatalogoEventos = {
  version: string;
  modulo: string;
  descripcion: string;
  eventos: Evento[];
};

function esEnteroNoNegativo(valor: number): boolean {
  return Number.isInteger(valor) && valor >= 0;
}

export function assertEvento(evento: Evento): void {
  if (!evento.id.startsWith("evt_") || evento.id.length <= 4) {
    throw new Error("El identificador del evento debe empezar por evt_");
  }
  if (!DEPORTES.includes(evento.deporte)) {
    throw new Error("Deporte no reconocido");
  }
  if (!NIVELES.includes(evento.nivel)) {
    throw new Error("Nivel no reconocido");
  }
  if (!ESTADOS_EVENTO.includes(evento.estado)) {
    throw new Error("Estado de evento no reconocido");
  }
  if (!esEnteroNoNegativo(evento.aforoMaximo)) {
    throw new Error("La capacidad no puede ser negativa");
  }
  if (!esEnteroNoNegativo(evento.plazasDisponibles)) {
    throw new Error("Las plazas libres no pueden bajar de cero");
  }
  if (evento.plazasDisponibles > evento.aforoMaximo) {
    throw new Error("Las plazas libres no pueden superar la capacidad");
  }
  if (evento.aforoMinimo !== undefined && evento.aforoMinimo !== null) {
    if (typeof evento.aforoMinimo !== "number" || !Number.isInteger(evento.aforoMinimo) || evento.aforoMinimo < 1) {
      throw new Error("El aforo mínimo debe ser un número entero mayor que cero");
    }
    if (evento.aforoMinimo > evento.aforoMaximo) {
      throw new Error("El aforo mínimo no puede superar el aforo máximo");
    }
  }
  if (evento.fechaLimiteInscripcion !== undefined && evento.fechaLimiteInscripcion !== null) {
    if (
      typeof evento.fechaLimiteInscripcion !== "string" ||
      !ISO_CON_OFFSET.test(evento.fechaLimiteInscripcion) ||
      Number.isNaN(Date.parse(evento.fechaLimiteInscripcion))
    ) {
      throw new Error("La fecha límite de inscripción debe ser una fecha ISO-8601 con zona horaria");
    }
    const inicioMs = Date.parse(evento.inicio);
    const limiteMs = Date.parse(evento.fechaLimiteInscripcion);
    if (Number.isFinite(inicioMs) && limiteMs >= inicioMs) {
      throw new Error("La fecha límite de inscripción debe ser anterior al inicio del evento");
    }
  }
  if (!Array.isArray(evento.material) || evento.material.some((item) => typeof item !== "string")) {
    throw new Error("El material debe ser una lista de textos");
  }
}

export function assertReserva(reserva: Reserva): void {
  if (!reserva.id.startsWith("ins_") || reserva.id.length <= 4) {
    throw new Error("El identificador de la reserva debe empezar por ins_");
  }
  if (!reserva.eventoId.startsWith("evt_")) {
    throw new Error("La reserva debe apuntar a un evento");
  }
  if (reserva.usuarioId.trim().length === 0) {
    throw new Error("El usuario de la reserva es obligatorio");
  }
  if (!ESTADOS_RESERVA.includes(reserva.estado)) {
    throw new Error("Estado de reserva no reconocido");
  }
}

