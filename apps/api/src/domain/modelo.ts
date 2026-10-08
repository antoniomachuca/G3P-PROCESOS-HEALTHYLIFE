export const DEPORTES = ["futbol", "running", "padel", "natacion", "yoga", "ciclismo"] as const;
export const NIVELES = ["iniciacion", "intermedio", "competicion"] as const;
export const ESTADOS_EVENTO = ["abierta", "cancelada", "finalizada"] as const;

export type Deporte = (typeof DEPORTES)[number];
export type Nivel = (typeof NIVELES)[number];
export type EstadoEvento = (typeof ESTADOS_EVENTO)[number];

export type Lugar = {
  nombre: string;
  puntoEncuentro: string;
  municipio: string;
  direccion: string;
  lat: number;
  lng: number;
};

/** Forma pública del contrato (contracts/eventos.ejemplo.json). */
export type Evento = {
  id: string;
  titulo: string;
  deporte: Deporte;
  nivel: Nivel;
  descripcion: string;
  inicio: string;
  fin: string;
  lugar: Lugar;
  aforoMaximo: number;
  plazasDisponibles: number;
  material: string[];
  estado: EstadoEvento;
  organizadorId: string;
  communityGroupId: string | null;
  routineId: string | null;
  /** Ruta o URL de la imagen del evento. Si falta, la interfaz muestra un hueco gris. */
  imagenUrl?: string | null;
};

export type CatalogoEventos = {
  version: string;
  modulo: string;
  descripcion: string;
  eventos: Evento[];
};
