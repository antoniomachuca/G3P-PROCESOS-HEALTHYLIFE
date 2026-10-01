import type { Evento, Reserva } from "./modelo.ts";

export interface EventStore {
  guardarEvento(evento: Evento): void;
  obtenerEvento(id: string): Evento | undefined;
  listarEventos(): Evento[];
  guardarReserva(reserva: Reserva): void;
  listarReservas(eventoId: string): Reserva[];
}
