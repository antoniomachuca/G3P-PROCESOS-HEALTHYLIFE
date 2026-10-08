export type Deporte = "futbol" | "running" | "padel" | "natacion" | "yoga" | "ciclismo";
export type EstadoReserva = "confirmada" | "en_espera";

export type Evento = {
  id: string;
  titulo: string;
  deporte: Deporte;
  nivel: "iniciacion" | "intermedio" | "competicion";
  descripcion: string;
  inicio: string;
  fin: string;
  lugar: {
    nombre: string;
    puntoEncuentro: string;
    municipio: string;
    direccion: string;
    lat: number;
    lng: number;
  };
  aforoMaximo: number;
  plazasDisponibles: number;
  material: string[];
  estado: "abierta" | "cancelada" | "finalizada";
  organizadorId: string;
  communityGroupId: string | null;
  routineId: string | null;
};

export type ResultadoReserva = {
  id: string;
  eventoId: string;
  usuarioId: string;
  estado: EstadoReserva;
  creadaEn: string;
  plazasDisponibles: number;
};