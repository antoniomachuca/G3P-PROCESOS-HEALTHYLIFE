import type { Evento, Nivel } from "./tipos";

// HU-08 / G3P-55: valores del formulario de edición a partir del evento guardado.
// Las fechas del contrato llevan offset; el formulario las muestra en hora de Madrid.
const ZONA = "Europe/Madrid";

export type ValoresEdicion = {
  // Editables
  titulo: string;
  descripcion: string;
  fecha: string; // AAAA-MM-DD
  horaInicio: string; // HH:mm
  horaFin: string; // HH:mm
  puntoEncuentro: string;
  nivel: Nivel;
  material: string; // separado por comas
  aforoMaximo: number;
  // Solo lectura
  deporte: Evento["deporte"];
  lugar: string;
  plazasOcupadas: number;
};

/** Valores del formulario ya normalizados, antes de compararlos con el evento guardado. */
export type CambiosEvento = {
  titulo: string;
  descripcion: string;
  inicio: string;
  fin: string;
  nivel: Nivel;
  puntoEncuentro: string;
  material: string[];
  aforoMaximo: number;
};

function partesEnMadrid(iso: string): { fecha: string; hora: string } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(iso))
      .map((parte) => [parte.type, parte.value]),
  );
  return { fecha: `${partes.year}-${partes.month}-${partes.day}`, hora: `${partes.hour}:${partes.minute}` };
}

export function plazasOcupadas(evento: Pick<Evento, "aforoMaximo" | "plazasDisponibles">): number {
  return Math.max(0, evento.aforoMaximo - evento.plazasDisponibles);
}

export function valoresFormularioEdicion(evento: Evento): ValoresEdicion {
  const inicio = partesEnMadrid(evento.inicio);
  const fin = partesEnMadrid(evento.fin);
  return {
    titulo: evento.titulo,
    descripcion: evento.descripcion,
    fecha: inicio.fecha,
    horaInicio: inicio.hora,
    horaFin: fin.hora,
    puntoEncuentro: evento.lugar.puntoEncuentro,
    nivel: evento.nivel,
    material: evento.material.join(", "),
    aforoMaximo: evento.aforoMaximo,
    deporte: evento.deporte,
    lugar: `${evento.lugar.nombre} · ${evento.lugar.municipio}`,
    plazasOcupadas: plazasOcupadas(evento),
  };
}

/** Offset de Madrid ("+01:00" o "+02:00") en el instante indicado. */
function offsetMadrid(instante: number): string {
  const nombre = new Intl.DateTimeFormat("en-US", { timeZone: ZONA, timeZoneName: "longOffset" })
    .formatToParts(new Date(instante))
    .find((parte) => parte.type === "timeZoneName")?.value;
  const offset = nombre?.replace("GMT", "") ?? "";
  return offset === "" ? "+00:00" : offset;
}

function minutosDeOffset(offset: string): number {
  const signo = offset.startsWith("-") ? -1 : 1;
  const [h, m] = offset.slice(1).split(":").map(Number);
  return signo * (h * 60 + m);
}

/** Convierte fecha y hora locales de Madrid en ISO-8601 con offset, como pide el contrato. */
export function isoEnMadrid(fecha: string, hora: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  const comoUtc = Date.UTC(anio, mes - 1, dia, h, min);
  let offset = offsetMadrid(comoUtc);
  // Segunda pasada por si la primera suposición cae al otro lado del cambio de hora.
  offset = offsetMadrid(comoUtc - minutosDeOffset(offset) * 60_000);
  return `${fecha}T${hora}:00${offset}`;
}

export function cambiosDesdeFormulario(valores: ValoresEdicion): CambiosEvento {
  return {
    titulo: valores.titulo.trim(),
    descripcion: valores.descripcion.trim(),
    inicio: isoEnMadrid(valores.fecha, valores.horaInicio),
    fin: isoEnMadrid(valores.fecha, valores.horaFin),
    nivel: valores.nivel,
    puntoEncuentro: valores.puntoEncuentro.trim(),
    material: valores.material
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    aforoMaximo: valores.aforoMaximo,
  };
}

/** Cuerpo del PATCH /api/v1/events/{id} con las claves del contrato. Solo lleva lo que cambia. */
export type CuerpoActualizacion = Partial<Omit<CambiosEvento, "puntoEncuentro">> & {
  lugar?: { puntoEncuentro: string };
};

function mismoInstante(a: string, b: string): boolean {
  return Date.parse(a) === Date.parse(b);
}

/**
 * G3P-58: compara el formulario con el evento guardado y devuelve solo los campos modificados.
 * Así un evento que ya empezó puede corregir el título sin que la API rechace la fecha.
 */
export function cuerpoActualizacion(cambios: CambiosEvento, evento: Evento): CuerpoActualizacion {
  const cuerpo: CuerpoActualizacion = {};
  if (cambios.titulo !== evento.titulo) cuerpo.titulo = cambios.titulo;
  if (cambios.descripcion !== evento.descripcion) cuerpo.descripcion = cambios.descripcion;
  if (!mismoInstante(cambios.inicio, evento.inicio)) cuerpo.inicio = cambios.inicio;
  if (!mismoInstante(cambios.fin, evento.fin)) cuerpo.fin = cambios.fin;
  if (cambios.nivel !== evento.nivel) cuerpo.nivel = cambios.nivel;
  if (cambios.puntoEncuentro !== evento.lugar.puntoEncuentro) cuerpo.lugar = { puntoEncuentro: cambios.puntoEncuentro };
  if (cambios.material.join("\u0000") !== evento.material.join("\u0000")) cuerpo.material = cambios.material;
  if (cambios.aforoMaximo !== evento.aforoMaximo) cuerpo.aforoMaximo = cambios.aforoMaximo;
  return cuerpo;
}

export type ErrorGuardado = { tipo: "aforo" | "general"; mensaje: string };

/** Traduce el rechazo de la API a lo que enseña el formulario: modal para el conflicto de aforo, alerta para el resto. */
export function errorDeGuardado(error: unknown): ErrorGuardado {
  const status = typeof error === "object" && error !== null && "status" in error ? (error as { status: unknown }).status : undefined;
  const mensaje = error instanceof Error && error.message ? error.message : "";
  if (status === 409) {
    return { tipo: "aforo", mensaje: mensaje || "La capacidad no puede ser menor al número de usuarios ya inscritos." };
  }
  if (status === 403) {
    return { tipo: "general", mensaje: "Solo el organizador de la actividad puede editarla." };
  }
  if (typeof status === "number") {
    return { tipo: "general", mensaje: mensaje || "No se han podido guardar los cambios." };
  }
  return { tipo: "general", mensaje: "No se ha podido contactar con el servicio de actividades." };
}
