import { randomBytes } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { EventStore, ResultadoReserva } from "../domain/event-store.ts";
import { fechaIsoConOffset } from "../domain/fecha.ts";
import { assertEvento, assertReserva, type Evento, type Reserva } from "../domain/modelo.ts";
import { ErrorDeReserva } from "../domain/errores-reserva.ts";

type EventoRow = {
  id: string;
  titulo: string;
  deporte: Evento["deporte"];
  nivel: Evento["nivel"];
  descripcion: string;
  inicio: string;
  fin: string;
  lugar_nombre: string;
  lugar_punto_encuentro: string;
  lugar_municipio: string;
  lugar_direccion: string;
  lugar_lat: number;
  lugar_lng: number;
  capacidad: number;
  plazas_libres: number;
  material: string;
  estado: Evento["estado"];
  organizador_id: string;
  community_group_id: string | null;
  routine_id: string | null;
};

type ReservaRow = {
  id: string;
  evento_id: string;
  usuario_id: string;
  estado: Reserva["estado"];
  creada_en: string;
};

const EVENTO_COLUMNS = `
  id, titulo, deporte, nivel, descripcion, inicio, fin,
  lugar_nombre, lugar_punto_encuentro, lugar_municipio, lugar_direccion,
  lugar_lat, lugar_lng, capacidad, plazas_libres, material, estado,
  organizador_id, community_group_id, routine_id
`;

function eventoDesdeFila(row: EventoRow): Evento {
  return {
    id: row.id,
    titulo: row.titulo,
    deporte: row.deporte,
    nivel: row.nivel,
    descripcion: row.descripcion,
    inicio: row.inicio,
    fin: row.fin,
    lugar: {
      nombre: row.lugar_nombre,
      puntoEncuentro: row.lugar_punto_encuentro,
      municipio: row.lugar_municipio,
      direccion: row.lugar_direccion,
      lat: row.lugar_lat,
      lng: row.lugar_lng,
    },
    aforoMaximo: row.capacidad,
    plazasDisponibles: row.plazas_libres,
    material: JSON.parse(row.material) as string[],
    estado: row.estado,
    organizadorId: row.organizador_id,
    communityGroupId: row.community_group_id,
    routineId: row.routine_id,
  };
}

function reservaDesdeFila(row: ReservaRow): Reserva {
  return {
    id: row.id,
    eventoId: row.evento_id,
    usuarioId: row.usuario_id,
    estado: row.estado,
    creadaEn: row.creada_en,
  };
}

export class SqliteEventStore implements EventStore {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  guardarEvento(evento: Evento): void {
    assertEvento(evento);
    this.db
      .prepare(
        `INSERT INTO eventos (${EVENTO_COLUMNS})
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        evento.id,
        evento.titulo,
        evento.deporte,
        evento.nivel,
        evento.descripcion,
        evento.inicio,
        evento.fin,
        evento.lugar.nombre,
        evento.lugar.puntoEncuentro,
        evento.lugar.municipio,
        evento.lugar.direccion,
        evento.lugar.lat,
        evento.lugar.lng,
        evento.aforoMaximo,
        evento.plazasDisponibles,
        JSON.stringify(evento.material),
        evento.estado,
        evento.organizadorId,
        evento.communityGroupId,
        evento.routineId,
      );
  }

  obtenerEvento(id: string): Evento | undefined {
    const row = this.db.prepare(`SELECT ${EVENTO_COLUMNS} FROM eventos WHERE id = ?`).get(id) as
      | EventoRow
      | undefined;
    return row ? eventoDesdeFila(row) : undefined;
  }

  listarEventos(): Evento[] {
    const rows = this.db.prepare(`SELECT ${EVENTO_COLUMNS} FROM eventos ORDER BY inicio`).all() as unknown as EventoRow[];
    return rows.map(eventoDesdeFila);
  }

  guardarReserva(reserva: Reserva): void {
    assertReserva(reserva);
    this.db
      .prepare(
        `INSERT INTO reservas (id, evento_id, usuario_id, estado, creada_en)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(reserva.id, reserva.eventoId, reserva.usuarioId, reserva.estado, reserva.creadaEn);
  }

  listarReservas(eventoId: string): Reserva[] {
    const rows = this.db
      .prepare(
        `SELECT id, evento_id, usuario_id, estado, creada_en
         FROM reservas
         WHERE evento_id = ?
         ORDER BY creada_en, id`,
      )
      .all(eventoId) as unknown as ReservaRow[];
    return rows.map(reservaDesdeFila);
  }

  reservar(eventoId: string, usuarioId: string): ResultadoReserva {
    const usuario = usuarioId.trim();
    if (usuario.length === 0) {
      throw new ErrorDeReserva("usuario_invalido", "El usuario de la reserva es obligatorio");
    }

    const reserva: Reserva = {
      id: `ins_${randomBytes(8).toString("hex")}`,
      eventoId,
      usuarioId: usuario,
      estado: "en_espera",
      creadaEn: fechaIsoConOffset(),
    };

    this.db.exec("BEGIN IMMEDIATE");
    try {
      const evento = this.obtenerEvento(eventoId);
      if (!evento) {
        throw new ErrorDeReserva("no_encontrado", "No existe ese evento");
      }
      if (!admiteReserva(evento)) {
        throw new ErrorDeReserva("no_reservable", "Este evento no admite reservas");
      }

      const yaActiva = this.db
        .prepare(
          `SELECT id FROM reservas
           WHERE evento_id = ? AND usuario_id = ? AND estado IN ('confirmada', 'en_espera')`,
        )
        .get(eventoId, usuario);
      if (yaActiva) {
        throw new ErrorDeReserva("duplicada", "Ya tienes una reserva en este evento");
      }

      const actualizacion = this.db
        .prepare(
          `UPDATE eventos
           SET plazas_libres = plazas_libres - 1
           WHERE id = ? AND plazas_libres > 0 AND estado = 'abierta'`,
        )
        .run(eventoId);
      reserva.estado = Number(actualizacion.changes) === 1 ? "confirmada" : "en_espera";
      this.guardarReserva(reserva);
      const plazasDisponibles =
        reserva.estado === "confirmada" ? evento.plazasDisponibles - 1 : evento.plazasDisponibles;
      this.db.exec("COMMIT");
      return { reserva, plazasDisponibles };
    } catch (error) {
      try {
        this.db.exec("ROLLBACK");
      } catch {
        // La transacción ya estaba cerrada.
      }
      throw error;
    }
  }
}

function admiteReserva(evento: Evento): boolean {
  if (evento.estado !== "abierta") {
    return false;
  }
  const fin = Date.parse(evento.fin);
  return Number.isFinite(fin) && fin > Date.now();
}
