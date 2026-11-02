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

/** Cambios que el formulario enviará al endpoint de actualización (G3P-56). */
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
