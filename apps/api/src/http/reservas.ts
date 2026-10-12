import type { IncomingMessage, ServerResponse } from "node:http";
import type { EventStore } from "../domain/event-store.ts";
import { ErrorDeReserva } from "../domain/errores-reserva.ts";
import { eventosActivos } from "../domain/catalogo.ts";
import { manejarEventosUsuario } from "./eventos-usuario.ts";

const ORIGEN_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

export function manejarReservas(store: EventStore, req: IncomingMessage, res: ServerResponse): void {
  aplicarCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const usuarioEnRuta = idDeUsuarioEnRuta(req);
  if (usuarioEnRuta) {
    manejarEventosUsuario(store, usuarioEnRuta, req, res);
    return;
  }

  const ruta = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  if (req.method === "GET" && (ruta === "/api/v1/events" || ruta === "/events")) {
    const eventos = eventosActivos(store.listarEventos());
    responder(res, 200, { eventos });
    return;
  }



  if (req.method === "POST" && ruta === "/api/v1/events") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        
        // Validación de fecha futura requerida por HU-07
        if (Date.parse(payload.inicio) < Date.now()) {
          responder(res, 400, { mensaje: "La fecha del evento debe ser futura" });
          return;
        }

        const nuevoEvento = {
          ...payload,
          id: `evt_${Date.now()}`,
          estado: "abierta",
          plazasDisponibles: payload.aforoMaximo
        };

        store.guardarEvento(nuevoEvento);
        responder(res, 201, nuevoEvento);
      } catch (error: any) {
        responder(res, 400, { mensaje: error.message || "Datos inválidos" });
      }
    });
    return;
  }

  const eventoId = idDeEvento(req);
  if (!eventoId || req.method !== "POST") {
    responder(res, req.method === "POST" ? 404 : 405, { mensaje: "Ruta no encontrada" });
    return;
  }

  const usuarioId = cabecera(req, "x-user-id");
  if (!usuarioId) {
    responder(res, 400, { mensaje: "Falta la cabecera X-User-Id" });
    return;
  }

  try {
    const resultado = store.reservar(decodeURIComponent(eventoId), usuarioId);
    responder(res, 201, {
      id: resultado.reserva.id,
      eventoId: resultado.reserva.eventoId,
      usuarioId: resultado.reserva.usuarioId,
      estado: resultado.reserva.estado,
      creadaEn: resultado.reserva.creadaEn,
      plazasDisponibles: resultado.plazasDisponibles,
    });
  } catch (error) {
    if (error instanceof ErrorDeReserva) {
      const status = error.codigo === "no_encontrado" ? 404 : error.codigo === "usuario_invalido" ? 400 : 409;
      responder(res, status, { mensaje: error.message });
      return;
    }
    responder(res, 500, { mensaje: "No se ha podido completar la reserva" });
  }
}

function idDeUsuarioEnRuta(req: IncomingMessage): string | undefined {
  const ruta = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  const coincidencia = ruta.match(/^(?:\/api\/v1)?\/users\/([^/]+)\/events\/?$/);
  return coincidencia ? decodeURIComponent(coincidencia[1]) : undefined;
}

function idDeEvento(req: IncomingMessage): string | undefined {
  const ruta = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  const coincidencia = ruta.match(/^(?:\/api\/v1)?\/events\/([^/]+)\/reservations$/);
  return coincidencia?.[1];
}


function cabecera(req: IncomingMessage, nombre: string): string {
  const valor = req.headers[nombre];
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return texto?.trim() ?? "";
}

function aplicarCors(req: IncomingMessage, res: ServerResponse): void {
  const origen = req.headers.origin;
  if (typeof origen !== "string" || !ORIGEN_LOCAL.test(origen)) {
    return;
  }
  res.setHeader("Access-Control-Allow-Origin", origen);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Id");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

function responder(res: ServerResponse, status: number, cuerpo: unknown): void {
  const json = JSON.stringify(cuerpo);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}
