import { useCallback, useEffect, useState } from 'react';
import { cargarEventos } from '../api';
import type { Evento } from '../tipos';
import { TarjetaEvento } from './TarjetaEvento';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'listo'; eventos: Evento[] };

export function CatalogoEventos() {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  const cargar = useCallback(() => {
    setEstado({ tipo: 'cargando' });
    cargarEventos()
      .then((eventos) => setEstado({ tipo: 'listo', eventos }))
      .catch(() => setEstado({ tipo: 'error' }));
  }, []);

  useEffect(cargar, [cargar]);

  const total = estado.tipo === 'listo' ? estado.eventos.length : 0;

  return (
    <section className="catalogo" id="catalogo" aria-labelledby="titulo-catalogo">
      <div className="catalogo__cabecera">
        <div>
          <span className="catalogo__sobretitulo">Convocatorias Disponibles</span>
          <h2 id="titulo-catalogo" className="catalogo__titulo">
            Catálogo de Actividades
          </h2>
        </div>
        {estado.tipo === 'listo' && (
          <p className="catalogo__contador">
            <span className="punto punto--verde" />
            Mostrando <strong>{total}</strong> {total === 1 ? 'actividad abierta' : 'actividades abiertas'}
          </p>
        )}
      </div>

      {estado.tipo === 'cargando' && (
        <p className="mensaje" role="status">
          Cargando actividades…
        </p>
      )}

      {estado.tipo === 'error' && (
        <div className="mensaje mensaje--error" role="alert">
          <p>No se han podido cargar las actividades. Comprueba tu conexión e inténtalo de nuevo.</p>
          <button type="button" className="boton boton--primario boton--auto" onClick={cargar}>
            Reintentar
          </button>
        </div>
      )}

      {estado.tipo === 'listo' && total === 0 && (
        <p className="mensaje">No hay eventos disponibles actualmente. Vuelve pronto.</p>
      )}

      {estado.tipo === 'listo' && total > 0 && (
        <div className="rejilla">
          {estado.eventos.map((evento) => (
            <TarjetaEvento key={evento.id} evento={evento} />
          ))}
        </div>
      )}
    </section>
  );
}
