export type Deporte = "futbol" | "running" | "padel" | "natacion" | "yoga" | "ciclismo";
export type Nivel = "iniciacion" | "intermedio" | "competicion";
export type EstadoReserva = "confirmada" | "en_espera";

export type Lugar = {
  nombre: string;
  puntoEncuentro: string;
  municipio: string;
  direccion: string;
  lat: number;
  lng: number;
};

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
  estado: "abierta" | "cancelada" | "finalizada";
  organizadorId: string;
  communityGroupId: string | null;
  routineId: string | null;
  // Ruta o URL de la imagen (contracts/eventos.ejemplo.json). Puede ser null.
  imagenUrl?: string | null;
};

export type ResultadoReserva = {
  id: string;
  eventoId: string;
  usuarioId: string;
  estado: EstadoReserva;
  creadaEn: string;
  plazasDisponibles: number;
};

