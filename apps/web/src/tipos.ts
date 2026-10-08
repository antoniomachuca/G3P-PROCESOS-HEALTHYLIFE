export type Deporte = 'futbol' | 'running' | 'padel' | 'natacion' | 'yoga' | 'ciclismo';
export type Nivel = 'iniciacion' | 'intermedio' | 'competicion';

export interface Lugar {
  nombre: string;
  puntoEncuentro: string;
  municipio: string;
}

export interface Evento {
  id: string;
  titulo: string;
  deporte: Deporte;
  nivel: Nivel;
  inicio: string;
  fin: string;
  lugar: Lugar;
  aforoMaximo: number;
  plazasDisponibles: number;
  // Ruta o URL de la imagen (contracts/eventos.ejemplo.json). Puede ser null.
  imagenUrl?: string | null;
}
