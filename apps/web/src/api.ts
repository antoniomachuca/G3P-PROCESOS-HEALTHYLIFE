import type { Evento } from './tipos';

export async function cargarEventos(): Promise<Evento[]> {
  const respuesta = await fetch('/api/v1/events');
  if (!respuesta.ok) throw new Error(`Error ${respuesta.status}`);
  const datos = (await respuesta.json()) as { eventos: Evento[] };
  return datos.eventos;
}
