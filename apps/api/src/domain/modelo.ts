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

/** Forma pública del contrato. En SQLite, aforoMaximo es capacidad y plazasDisponibles es plazas_libres. */
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
  material: string[];
  estado: EstadoEvento;
  organizadorId: string;
  communityGroupId: string | null;
  routineId: string | null;
};

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
