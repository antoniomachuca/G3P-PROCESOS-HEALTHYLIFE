import type { Evento, Reserva } from "./modelo.ts";

export type ResultadoReserva = {
  reserva: Reserva;
  plazasDisponibles: number;
};

export type ResultadoCancelacion = {
  reserva: Reserva;
  plazasDisponibles: number;
};

export interface EventStore {
  guardarEvento(evento: Evento): void;
  obtenerEvento(id: string): Evento | undefined;
  listarEventos(): Evento[];
  guardarReserva(reserva: Reserva): void;
  obtenerReserva?(id: string): Reserva | undefined;
  listarReservas(eventoId: string): Reserva[];
  reservar(eventoId: string, usuarioId: string): ResultadoReserva;
  cancelarReserva(eventoId: string, usuarioId: string): ResultadoCancelacion;
  cancelarReservaPorId?(reservaId: string, usuarioId?: string): ResultadoCancelacion;
  listarEventosPorUsuario(usuarioId: string): Evento[];
  listarReservasPorUsuario(usuarioId: string): Reserva[];
}

