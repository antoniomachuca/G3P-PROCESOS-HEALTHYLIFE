import type { IncomingMessage, ServerResponse } from "node:http";
import type { EventStore } from "../domain/event-store.ts";
import { eventosActivos } from "../domain/catalogo.ts";
import type { Deporte, Evento } from "../domain/modelo.ts";

const ORIGEN_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

const CALORIAS_POR_HORA: Record<Deporte, number> = {
  running: 500,
  futbol: 500,
  natacion: 450,
  ciclismo: 400,
  padel: 350,
  yoga: 180,
};

export function estimarCalorias(deporte: Deporte, inicio: string, fin: string): number {
  const diffMs = Date.parse(fin) - Date.parse(inicio);
  const duracionHoras = Number.isFinite(diffMs) && diffMs > 0 ? diffMs / (1000 * 60 * 60) : 1;
  const base = CALORIAS_POR_HORA[deporte] ?? 300;
  return Math.round(base * duracionHoras);
}

export function fechasDeActividad(inicio: string, fin: string): string[] {
  const fInicio = inicio.split("T")[0];
  const fFin = fin.split("T")[0];
  if (!fFin || fInicio === fFin) {
    return [fInicio];
  }
  return [fInicio, fFin];
}

export type EventoUsuarioDTO = {
  event_id: string;
  name: string;
  type: string;
  location: string;
  available_places: number;
  activity_dates: string[];
  estimated_calories: number;
  enrolled: boolean;
};

export type RespuestaEventosUsuario = {
  user_id: string;
  events: EventoUsuarioDTO[];
};

export function adaptarEventoParaUsuario(evento: Evento, inscrito = true): EventoUsuarioDTO {
  const nombreLugar = evento.lugar.nombre
    ? (evento.lugar.municipio ? `${evento.lugar.nombre} (${evento.lugar.municipio})` : evento.lugar.nombre)
    : evento.lugar.direccion;
  const calorias = estimarCalorias(evento.deporte, evento.inicio, evento.fin);
  const fechas = fechasDeActividad(evento.inicio, evento.fin);

  return {
    event_id: evento.id,
    name: evento.titulo,
    type: evento.deporte,
    location: nombreLugar,
    available_places: evento.plazasDisponibles,
    activity_dates: fechas,
    estimated_calories: calorias,
    enrolled: inscrito,
  };
}

export function manejarEventosUsuario(
  store: EventStore,
  usuarioId: string,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  aplicarCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    responder(res, 405, { mensaje: "Método no permitido" });
    return;
  }

  const idLimpio = usuarioId.trim();
  if (!idLimpio) {
    responder(res, 400, { mensaje: "El identificador de usuario es obligatorio" });
    return;
  }

  const parsedUrl = new URL(req.url ?? "/", "http://127.0.0.1");
  const soloInscritos =
    parsedUrl.searchParams.get("only_enrolled") === "true" ||
    parsedUrl.searchParams.get("inscritos") === "true";

  const eventosInscritos = store.listarEventosPorUsuario(idLimpio);

  let listaEventos: EventoUsuarioDTO[];
  if (eventosInscritos.length > 0) {
    listaEventos = eventosInscritos.map((e) => adaptarEventoParaUsuario(e, true));
  } else if (soloInscritos) {
    listaEventos = [];
  } else {
    // Si el usuario no tiene inscripciones previas, devolvemos las actividades abiertas recomendadas
    const activos = eventosActivos(store.listarEventos());
    listaEventos = activos.map((e) => adaptarEventoParaUsuario(e, false));
  }

  const cuerpo: RespuestaEventosUsuario = {
    user_id: idLimpio,
    events: listaEventos,
  };

  responder(res, 200, cuerpo);
}

function aplicarCors(req: IncomingMessage, res: ServerResponse): void {
  const origen = req.headers.origin;
  if (typeof origen !== "string" || !ORIGEN_LOCAL.test(origen)) {
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origen);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
}

function responder(res: ServerResponse, status: number, cuerpo: unknown): void {
  const json = JSON.stringify(cuerpo);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}
