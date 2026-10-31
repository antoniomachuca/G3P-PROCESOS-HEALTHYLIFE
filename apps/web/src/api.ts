import type { Evento, ResultadoReserva } from "./tipos";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function cargarEventos(): Promise<Evento[]> {
  const respuesta = await fetch("/api/v1/events");
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, "No se han podido cargar las actividades.");
  }

  const datos = (await respuesta.json()) as { eventos: Evento[] };
  return datos.eventos;
}

export async function reservarPlaza(eventoId: string, usuarioId: string): Promise<ResultadoReserva> {
  const respuesta = await fetch(`/api/v1/events/${encodeURIComponent(eventoId)}/reservations`, {
    method: "POST",
    headers: { "X-User-Id": usuarioId },
  });
  const cuerpo = (await respuesta.json()) as ResultadoReserva | { mensaje?: string };

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      "mensaje" in cuerpo && cuerpo.mensaje ? cuerpo.mensaje : "No se ha podido completar la reserva.",
    );
  }

  return cuerpo as ResultadoReserva;
}

export async function cancelarInscripcion(
  eventoId: string,
  usuarioId: string,
): Promise<{ id: string; eventoId: string; usuarioId: string; estado: string; plazasDisponibles: number; mensaje: string }> {
  const respuesta = await fetch(`/api/v1/events/${encodeURIComponent(eventoId)}/reservations`, {
    method: "DELETE",
    headers: { "X-User-Id": usuarioId },
  });
  const cuerpo = (await respuesta.json()) as { id: string; eventoId: string; usuarioId: string; estado: string; plazasDisponibles: number; mensaje: string } | { mensaje?: string };

  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      "mensaje" in cuerpo && cuerpo.mensaje ? cuerpo.mensaje : "No se ha podido cancelar la inscripción.",
    );
  }

  return cuerpo as { id: string; eventoId: string; usuarioId: string; estado: string; plazasDisponibles: number; mensaje: string };
}

export async function crearEvento(datosEvento: Omit<Evento, "id" | "estado" | "plazasDisponibles">): Promise<Evento> {
  const respuesta = await fetch("/api/v1/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(datosEvento),
  });
  
  const cuerpo = (await respuesta.json()) as Evento | { mensaje?: string };
  
  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      "mensaje" in cuerpo && cuerpo.mensaje ? cuerpo.mensaje : "No se ha podido publicar el evento."
    );
  }
  
  return cuerpo as Evento;
}

