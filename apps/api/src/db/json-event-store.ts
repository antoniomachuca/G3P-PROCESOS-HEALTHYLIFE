import { readFileSync } from "node:fs";
import type { CatalogoEventos, Evento } from "../domain/modelo.ts";

/**
 * Almacén de solo lectura sobre data/eventos.json (HU-01).
 * Expone listarEventos() con la misma firma que el EventStore de SQLite,
 * así el handler HTTP no cambia cuando se sustituya.
 */
export class JsonEventStore {
  readonly ruta: string;

  constructor(ruta: string) {
    this.ruta = ruta;
  }

  listarEventos(): Evento[] {
    const catalogo = JSON.parse(readFileSync(this.ruta, "utf8")) as CatalogoEventos;
    return catalogo.eventos;
  }
}
