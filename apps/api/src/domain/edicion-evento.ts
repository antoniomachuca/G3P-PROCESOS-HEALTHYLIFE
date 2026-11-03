import { NIVELES, type Evento, type Nivel } from "./modelo.ts";

// HU-08 / G3P-56: qué puede cambiar el organizador de un evento y con qué reglas.

export type CodigoErrorEdicion =
  | "no_encontrado"
  | "sin_usuario"
  | "no_organizador"
  | "datos_invalidos"
  | "campo_bloqueado"
  | "aforo_insuficiente"
  | "fecha_pasada";

export class ErrorDeEdicion extends Error {
  readonly codigo: CodigoErrorEdicion;

  constructor(codigo: CodigoErrorEdicion, message: string) {
    super(message);
    this.codigo = codigo;
  }
}

/** Cambios ya validados. Solo aparecen los campos que llegan en la petición. */
export type CambiosEvento = {
  titulo?: string;
  descripcion?: string;
  inicio?: string;
  fin?: string;
  nivel?: Nivel;
  puntoEncuentro?: string;
  material?: string[];
  aforoMaximo?: number;
};

const EDITABLES = new Set(["titulo", "descripcion", "inicio", "fin", "nivel", "lugar", "material", "aforoMaximo"]);
const LUGAR_EDITABLE = new Set(["puntoEncuentro"]);
// ISO-8601 con offset obligatorio, como el resto del contrato.
const ISO_CON_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?([+-]\d{2}:\d{2}|Z)$/;

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function textoObligatorio(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || valor.trim().length === 0) {
    throw new ErrorDeEdicion("datos_invalidos", `El campo ${campo} no puede estar vacío`);
  }
  return valor.trim();
}

function fecha(valor: unknown, campo: string): string {
  if (typeof valor !== "string" || !ISO_CON_OFFSET.test(valor) || Number.isNaN(Date.parse(valor))) {
    throw new ErrorDeEdicion("datos_invalidos", `El campo ${campo} debe ser una fecha ISO-8601 con zona horaria`);
  }
  return valor;
}

/**
 * G3P-57: solo el organizador del evento puede editarlo. El usuario llega en X-User-Id
 * (sustituto temporal hasta que E1 publique su mecanismo de identidad).
 */
export function asegurarOrganizador(evento: Pick<Evento, "organizadorId">, usuarioId: string): void {
  if (usuarioId.trim().length === 0) {
    throw new ErrorDeEdicion("sin_usuario", "Falta la cabecera X-User-Id");
  }
  if (evento.organizadorId !== usuarioId) {
    throw new ErrorDeEdicion("no_organizador", "Solo el organizador del evento puede editarlo");
  }
}

/** Plazas que ya están cogidas: lo que la capacidad nunca puede quedar por debajo. */
export function plazasOcupadas(evento: Pick<Evento, "aforoMaximo" | "plazasDisponibles">): number {
  return evento.aforoMaximo - evento.plazasDisponibles;
}

/**
 * Comprueba el cuerpo de un PATCH contra el evento actual.
 * Rechaza campos bloqueados (deporte, lugar salvo punto de encuentro, plazas, estado, organizador...),
 * un aforo menor que las plazas ocupadas y un inicio que no sea estrictamente futuro.
 */
export function validarCambiosEvento(cuerpo: unknown, actual: Evento, ahora: Date = new Date()): CambiosEvento {
  if (!esObjeto(cuerpo)) {
    throw new ErrorDeEdicion("datos_invalidos", "El cuerpo de la petición debe ser un objeto JSON");
  }

  for (const campo of Object.keys(cuerpo)) {
    if (!EDITABLES.has(campo)) {
      throw new ErrorDeEdicion("campo_bloqueado", `El campo ${campo} no se puede modificar`);
    }
  }

  const cambios: CambiosEvento = {};

  if ("titulo" in cuerpo) cambios.titulo = textoObligatorio(cuerpo.titulo, "titulo");
  if ("descripcion" in cuerpo) cambios.descripcion = textoObligatorio(cuerpo.descripcion, "descripcion");

  if ("nivel" in cuerpo) {
    if (!NIVELES.includes(cuerpo.nivel as Nivel)) {
      throw new ErrorDeEdicion("datos_invalidos", `El nivel debe ser uno de: ${NIVELES.join(", ")}`);
    }
    cambios.nivel = cuerpo.nivel as Nivel;
  }

  if ("lugar" in cuerpo) {
    const lugar = cuerpo.lugar;
    if (!esObjeto(lugar)) {
      throw new ErrorDeEdicion("datos_invalidos", "El campo lugar debe ser un objeto");
    }
    for (const campo of Object.keys(lugar)) {
      if (!LUGAR_EDITABLE.has(campo)) {
        throw new ErrorDeEdicion("campo_bloqueado", `El campo lugar.${campo} no se puede modificar`);
      }
    }
    if ("puntoEncuentro" in lugar) {
      cambios.puntoEncuentro = textoObligatorio(lugar.puntoEncuentro, "lugar.puntoEncuentro");
    }
  }

  if ("material" in cuerpo) {
    const material = cuerpo.material;
    if (!Array.isArray(material) || material.some((item) => typeof item !== "string")) {
      throw new ErrorDeEdicion("datos_invalidos", "El material debe ser una lista de textos");
    }
    cambios.material = material.map((item: string) => item.trim()).filter(Boolean);
  }

  if ("aforoMaximo" in cuerpo) {
    const aforo = cuerpo.aforoMaximo;
    if (typeof aforo !== "number" || !Number.isInteger(aforo) || aforo < 1) {
      throw new ErrorDeEdicion("datos_invalidos", "La capacidad debe ser un número entero mayor que cero");
    }
    const ocupadas = plazasOcupadas(actual);
    if (aforo < ocupadas) {
      throw new ErrorDeEdicion(
        "aforo_insuficiente",
        `La capacidad no puede ser menor al número de usuarios ya inscritos (${ocupadas})`,
      );
    }
    cambios.aforoMaximo = aforo;
  }

  if ("inicio" in cuerpo) cambios.inicio = fecha(cuerpo.inicio, "inicio");
  if ("fin" in cuerpo) cambios.fin = fecha(cuerpo.fin, "fin");

  if (cambios.inicio !== undefined && Date.parse(cambios.inicio) <= ahora.getTime()) {
    throw new ErrorDeEdicion("fecha_pasada", "La nueva fecha de inicio debe ser futura");
  }
  if (cambios.inicio !== undefined || cambios.fin !== undefined) {
    const inicio = Date.parse(cambios.inicio ?? actual.inicio);
    const fin = Date.parse(cambios.fin ?? actual.fin);
    if (fin <= inicio) {
      throw new ErrorDeEdicion("datos_invalidos", "La hora de fin debe ser posterior a la de inicio");
    }
  }

  return cambios;
}
