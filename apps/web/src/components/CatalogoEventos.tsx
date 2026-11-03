import { useCallback, useEffect, useState } from 'react';
import { cargarEventos } from '../api';
import {
  DEPORTES_FILTRO,
  MENSAJE_SIN_EVENTOS_CATEGORIA,
  NOMBRE_DEPORTE,
  alternarFiltroDeporte,
  filtrarEventosCatalogo,
} from '../formato';
import type { Deporte, Evento, Nivel } from '../tipos';
import { TarjetaEvento } from './TarjetaEvento';

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'listo'; eventos: Evento[] };

export type CatalogoEventosProps = {
  eventosIniciales?: Evento[];
  deporteInicial?: Deporte | 'todos';
  campusActivo?: string;
  nivelActivo?: Nivel | 'todos';
  consultaActiva?: string;
  onCambioDeporte?: (deporte: Deporte | 'todos') => void;
};

export function CatalogoEventos({
  eventosIniciales,
  deporteInicial = 'todos',
  campusActivo,
  nivelActivo = 'todos',
  consultaActiva = '',
  onCambioDeporte,
}: CatalogoEventosProps = {}) {
  const [estado, setEstado] = useState<Estado>(
    eventosIniciales ? { tipo: 'listo', eventos: eventosIniciales } : { tipo: 'cargando' },
  );
  const [deporteActivo, setDeporteActivo] = useState<Deporte | 'todos'>(deporteInicial);

  const cargar = useCallback(() => {
    if (eventosIniciales) return;
    setEstado({ tipo: 'cargando' });
    cargarEventos()
      .then((eventos) => setEstado({ tipo: 'listo', eventos }))
      .catch(() => setEstado({ tipo: 'error' }));
  }, [eventosIniciales]);

  useEffect(cargar, [cargar]);

  const seleccionarDeporte = (deporte: Deporte | 'todos') => {
    const siguiente = alternarFiltroDeporte(deporteActivo, deporte);
    setDeporteActivo(siguiente);
    onCambioDeporte?.(siguiente);
  };

  const eventosFiltrados =
    estado.tipo === 'listo'
      ? filtrarEventosCatalogo(estado.eventos, {
          deporte: deporteActivo,
          campus: campusActivo,
          nivel: nivelActivo,
          consulta: consultaActiva,
        })
      : [];
  const total = eventosFiltrados.length;

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

      <div className="filtros-deporte" role="group" aria-label="Filtrar por deporte">
        {DEPORTES_FILTRO.map((deporte) => {
          const activo = deporteActivo === deporte;
          return (
            <button
              key={deporte}
              type="button"
              className={activo ? 'filtro filtro--activo' : 'filtro'}
              aria-pressed={activo}
              onClick={() => seleccionarDeporte(deporte)}
            >
              {deporte === 'todos' ? 'Todos' : NOMBRE_DEPORTE[deporte]}
            </button>
          );
        })}
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
        <div className="mensaje estado-pagina" role="status">
          <p>{MENSAJE_SIN_EVENTOS_CATEGORIA}</p>
          {deporteActivo !== 'todos' && (
            <button
              type="button"
              className="boton boton--secundario boton--auto"
              onClick={() => seleccionarDeporte('todos')}
            >
              Ver todos los deportes
            </button>
          )}
        </div>
      )}

      {estado.tipo === 'listo' && total > 0 && (
        <div className="rejilla">
          {eventosFiltrados.map((evento) => (
            <TarjetaEvento key={evento.id} evento={evento} />
          ))}
        </div>
      )}
    </section>
  );
}
