import type { CuerpoActualizacion } from "./edicion";
import type { EstadoReserva, Evento, ResultadoReserva } from "./tipos";

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

/** Lee un evento de la base con sus datos actuales (GET /api/v1/events/{id}). */
export async function cargarEvento(eventoId: string): Promise<Evento> {
  const respuesta = await fetch(`/api/v1/events/${encodeURIComponent(eventoId)}`);
  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      respuesta.status === 404 ? "La actividad ya no existe." : "No se han podido cargar los datos de la actividad.",
    );
  }
  return (await respuesta.json()) as Evento;
}

/** HU-08 / G3P-58: guarda los cambios de un evento (PATCH /api/v1/events/{id}). Solo puede hacerlo su organizador. */
export async function actualizarEvento(eventoId: string, cuerpo: CuerpoActualizacion, usuarioId: string): Promise<Evento> {
  const respuesta = await fetch(`/api/v1/events/${encodeURIComponent(eventoId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-User-Id": usuarioId },
    body: JSON.stringify(cuerpo),
  });
  const datos = (await respuesta.json().catch(() => ({}))) as Evento | { mensaje?: string };
  if (!respuesta.ok) {
    throw new ApiError(
      respuesta.status,
      "mensaje" in datos && datos.mensaje ? datos.mensaje : "No se han podido guardar los cambios.",
    );
  }
  return datos as Evento;
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

export async function cargarInscripcionesUsuario(usuarioId: string): Promise<Record<string, EstadoReserva>> {
  try {
    const respuesta = await fetch(`/api/v1/users/${encodeURIComponent(usuarioId)}/events?only_enrolled=true`);
    if (!respuesta.ok) return {};
    const datos = (await respuesta.json()) as { events?: Array<{ event_id?: string; id?: string }> };
    const mapa: Record<string, EstadoReserva> = {};
    for (const e of datos.events || []) {
      const id = e.event_id || e.id;
      if (id) mapa[id] = "confirmada";
    }
    return mapa;
  } catch {
    return {};
  }
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


/** Mis actividades (HU-17): reservas confirmadas con fin futuro, ordenadas por inicio (GET /api/v1/me/events). */
export async function cargarMisActividades(usuarioId: string): Promise<Evento[]> {
  const respuesta = await fetch("/api/v1/me/events", { headers: { "X-User-Id": usuarioId } });
  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, "No se han podido cargar tus actividades.");
  }
  const datos = (await respuesta.json()) as { eventos: Evento[] };
  return datos.eventos;
}
