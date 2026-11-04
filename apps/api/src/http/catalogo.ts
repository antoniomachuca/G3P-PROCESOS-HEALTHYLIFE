import type { IncomingMessage, ServerResponse } from "node:http";
import { esDeporteValido, esNivelValido, eventosActivos, filtrarCatalogo } from "../domain/catalogo.ts";
import type { Evento } from "../domain/modelo.ts";

export type LectorEventos = { listarEventos(): Evento[] };

const ORIGEN_LOCAL = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

/** GET /api/v1/events → { eventos: [...] } solo con el catálogo activo (admite ?deporte=, ?nivel=, ?campus=). */
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

  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname !== "/api/v1/events") {
    responder(res, 404, { mensaje: "Ruta no encontrada" });
    return;
  }
  if (req.method !== "GET") {
    responder(res, 405, { mensaje: "Método no permitido" });
    return;
  }

  const deporte = url.searchParams.get("deporte")?.trim().toLowerCase() ?? "";
  if (deporte && deporte !== "todos" && !esDeporteValido(deporte)) {
    responder(res, 400, { mensaje: "Modalidad deportiva no válida" });
    return;
  }

  const nivel = url.searchParams.get("nivel")?.trim().toLowerCase() ?? "";
  if (nivel && nivel !== "todos" && !esNivelValido(nivel)) {
    responder(res, 400, { mensaje: "Nivel no válido" });
    return;
  }

  const campus = url.searchParams.get("campus")?.trim() ?? "";

  try {
    const activos = eventosActivos(store.listarEventos(), ahora);
    const eventos = filtrarCatalogo(activos, { deporte, nivel, campus });
    responder(res, 200, { eventos });
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
