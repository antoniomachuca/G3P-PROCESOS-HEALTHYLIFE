import type { IncomingMessage, ServerResponse } from "node:http";
import { eventosActivos } from "../domain/catalogo.ts";
import type { Evento } from "../domain/modelo.ts";

export type LectorEventos = { listarEventos(): Evento[] };

const ORIGEN_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

/** GET /api/v1/events → { eventos: [...] } solo con el catálogo activo. */
export function manejarCatalogo(
  store: LectorEventos,
  req: IncomingMessage,
  res: ServerResponse,
  ahora: Date = new Date(),
): void {
  aplicarCors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const ruta = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
  if (ruta !== "/api/v1/events") {
    responder(res, 404, { mensaje: "Ruta no encontrada" });
    return;
  }
  if (req.method !== "GET") {
    responder(res, 405, { mensaje: "Método no permitido" });
    return;
  }

  try {
    responder(res, 200, { eventos: eventosActivos(store.listarEventos(), ahora) });
  } catch {
    responder(res, 500, { mensaje: "No se ha podido cargar el catálogo de eventos" });
  }
}

function aplicarCors(req: IncomingMessage, res: ServerResponse): void {
  const origen = req.headers.origin;
  if (origen && ORIGEN_LOCAL.test(origen)) {
    res.setHeader("Access-Control-Allow-Origin", origen);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-User-Id");
  }
}

function responder(res: ServerResponse, estado: number, cuerpo: unknown): void {
  res.writeHead(estado, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(cuerpo));
}
