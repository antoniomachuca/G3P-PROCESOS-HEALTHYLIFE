import type { IncomingMessage, ServerResponse } from "node:http";
import type { EventStore } from "../domain/event-store.ts";
import { ErrorDeReserva } from "../domain/errores-reserva.ts";
import { ErrorDeEdicion } from "../domain/edicion-evento.ts";
import { actividadesProximas, eventosActivos } from "../domain/catalogo.ts";
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

  // HU-17 / G3P-52: mis actividades futuras con reserva confirmada. El usuario llega en X-User-Id (§5 de AGENTS.md).
  if (req.method === "GET" && (ruta === "/api/v1/me/events" || ruta === "/me/events")) {
    const usuarioId = cabecera(req, "x-user-id");
    if (!usuarioId) {
      responder(res, 400, { mensaje: "Falta la cabecera X-User-Id" });
      return;
    }
    responder(res, 200, { eventos: actividadesProximas(store.listarEventosPorUsuario(usuarioId)) });
    return;
  }

  // Ficha completa de un evento, también fuera del catálogo activo: el formulario de edición la precarga.
  const eventoEnRuta = ruta.match(/^\/api\/v1\/events\/([^/]+)\/?$/);
  if (req.method === "GET" && eventoEnRuta) {
    const evento = store.obtenerEvento(decodeURIComponent(eventoEnRuta[1]));
    if (!evento) {
      responder(res, 404, { mensaje: "Evento no encontrado" });
      return;
    }
    responder(res, 200, evento);
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

  // HU-08 / G3P-56: PATCH /api/v1/events/{id} con los campos editables del evento.
  if (eventoEnRuta && req.method === "PATCH") {
    const eventoId = decodeURIComponent(eventoEnRuta[1]);
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      let cuerpo: unknown;
      try {
        cuerpo = JSON.parse(body);
      } catch {
        responder(res, 400, { mensaje: "El cuerpo de la petición no es JSON válido" });
        return;
      }
      try {
        responder(res, 200, store.actualizarEvento(eventoId, cuerpo));
      } catch (error) {
        manejarErrorEdicion(res, error);
      }
    });
    return;
  }

  const rutaReserva = parsearRutaReservas(ruta);
  if (!rutaReserva) {
    responder(res, 404, { mensaje: "Ruta no encontrada" });
    return;
  }

  if (req.method === "POST") {
    if (rutaReserva.tipo !== "evento_reservas" || rutaReserva.reservaId) {
      responder(res, 405, { mensaje: "Método no permitido" });
      return;
    }

    const usuarioId = cabecera(req, "x-user-id");
    if (!usuarioId) {
      responder(res, 400, { mensaje: "Falta la cabecera X-User-Id" });
      return;
    }

    try {
      const resultado = store.reservar(rutaReserva.eventoId, usuarioId);
      responder(res, 201, {
        id: resultado.reserva.id,
        eventoId: resultado.reserva.eventoId,
        usuarioId: resultado.reserva.usuarioId,
        estado: resultado.reserva.estado,
        creadaEn: resultado.reserva.creadaEn,
        plazasDisponibles: resultado.plazasDisponibles,
      });
    } catch (error) {
      manejarErrorReserva(res, error, "No se ha podido completar la reserva");
    }
    return;
  }

  if (req.method === "DELETE" || req.method === "PATCH") {
    const usuarioId = cabecera(req, "x-user-id");

    try {
      let resultado;
      if (rutaReserva.tipo === "reserva_directa" || (rutaReserva.tipo === "evento_reservas" && rutaReserva.reservaId)) {
        const idAUsar = rutaReserva.reservaId!;
        if (store.cancelarReservaPorId) {
          resultado = store.cancelarReservaPorId(idAUsar, usuarioId || undefined);
        } else if (rutaReserva.tipo === "evento_reservas") {
          resultado = store.cancelarReserva(rutaReserva.eventoId, usuarioId);
        } else {
          responder(res, 501, { mensaje: "Operación no soportada por el almacén" });
          return;
        }
      } else {
        if (!usuarioId) {
          responder(res, 400, { mensaje: "Falta la cabecera X-User-Id" });
          return;
        }
        resultado = store.cancelarReserva(rutaReserva.eventoId, usuarioId);
      }

      responder(res, 200, {
        id: resultado.reserva.id,
        eventoId: resultado.reserva.eventoId,
        usuarioId: resultado.reserva.usuarioId,
        estado: resultado.reserva.estado,
        plazasDisponibles: resultado.plazasDisponibles,
        mensaje: "Inscripción cancelada correctamente",
      });
    } catch (error) {
      manejarErrorReserva(res, error, "No se ha podido cancelar la inscripción");
    }
    return;
  }

  responder(res, 405, { mensaje: "Método no permitido" });
}

type RutaReserva =
  | { tipo: "evento_reservas"; eventoId: string; reservaId?: string }
  | { tipo: "reserva_directa"; reservaId: string };

function parsearRutaReservas(ruta: string): RutaReserva | null {
  const mEvento = ruta.match(/^(?:\/api\/v1)?\/events\/([^/]+)\/reservations(?:\/([^/]+))?\/?$/);
  if (mEvento) {
    return {
      tipo: "evento_reservas",
      eventoId: decodeURIComponent(mEvento[1]),
      reservaId: mEvento[2] ? decodeURIComponent(mEvento[2]) : undefined,
    };
  }
  const mDirecta = ruta.match(/^(?:\/api\/v1)?\/reservations\/([^/]+)\/?$/);
  if (mDirecta) {
    return {
      tipo: "reserva_directa",
      reservaId: decodeURIComponent(mDirecta[1]),
    };
  }
  return null;
}

function manejarErrorReserva(res: ServerResponse, error: unknown, fallbackMensaje: string): void {
  if (error instanceof ErrorDeReserva) {
    let status = 400;
    if (error.codigo === "no_encontrado") status = 404;
    else if (error.codigo === "duplicada" || error.codigo === "ya_cancelada") status = 409;
    else if (error.codigo === "evento_iniciado") status = 400;
    else if (error.codigo === "usuario_invalido") status = 400;
    responder(res, status, { mensaje: error.message });
    return;
  }
  responder(res, 500, { mensaje: fallbackMensaje });
}


const ESTADO_ERROR_EDICION: Record<ErrorDeEdicion["codigo"], number> = {
  no_encontrado: 404,
  datos_invalidos: 400,
  campo_bloqueado: 400,
  fecha_pasada: 400,
  aforo_insuficiente: 409,
};

function manejarErrorEdicion(res: ServerResponse, error: unknown): void {
  if (error instanceof ErrorDeEdicion) {
    responder(res, ESTADO_ERROR_EDICION[error.codigo], { mensaje: error.message });
    return;
  }
  responder(res, 500, { mensaje: "No se ha podido actualizar el evento" });
}

function idDeUsuarioEnRuta(req: IncomingMessage): string | undefined {
  const ruta = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  const coincidencia = ruta.match(/^(?:\/api\/v1)?\/users\/([^/]+)\/events\/?$/);
  return coincidencia ? decodeURIComponent(coincidencia[1]) : undefined;
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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, PATCH, OPTIONS");
}

function responder(res: ServerResponse, status: number, cuerpo: unknown): void {
  const json = JSON.stringify(cuerpo);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}
