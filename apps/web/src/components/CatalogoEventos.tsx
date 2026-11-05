import { useCallback, useEffect, useState } from 'react';
import { cargarEventos } from '../api';
import {
  DEPORTES_FILTRO,
  MENSAJE_SIN_EVENTOS_CATEGORIA,
  MENSAJE_SIN_EVENTOS_NIVEL,
  NIVELES_FILTRO,
  NOMBRE_DEPORTE,
  NOMBRE_NIVEL,
  alternarFiltroDeporte,
  alternarFiltroNivel,
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
  nivelInicial?: Nivel | 'todos';
  campusActivo?: string;
  nivelActivo?: Nivel | 'todos';
  consultaActiva?: string;
  onCambioDeporte?: (deporte: Deporte | 'todos') => void;
  onCambioNivel?: (nivel: Nivel | 'todos') => void;
};

export function CatalogoEventos({
  eventosIniciales,
  deporteInicial = 'todos',
  nivelInicial = 'todos',
  campusActivo,
  nivelActivo: nivelActivoProp,
  consultaActiva = '',
  onCambioDeporte,
  onCambioNivel,
}: CatalogoEventosProps = {}) {
  const [estado, setEstado] = useState<Estado>(
    eventosIniciales ? { tipo: 'listo', eventos: eventosIniciales } : { tipo: 'cargando' },
  );
  const [deporteActivo, setDeporteActivo] = useState<Deporte | 'todos'>(deporteInicial);
  const [nivelEstado, setNivelEstado] = useState<Nivel | 'todos'>(nivelActivoProp ?? nivelInicial);
  const nivelActivo = nivelActivoProp !== undefined ? nivelActivoProp : nivelEstado;

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

  const seleccionarNivel = (nivel: Nivel | 'todos') => {
    const siguiente = alternarFiltroNivel(nivelActivo, nivel);
    setNivelEstado(siguiente);
    onCambioNivel?.(siguiente);
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

      <div className="filtros-seccion">
        <div className="filtros-grupo">
          <span className="filtros-grupo__etiqueta">Modalidad deportiva:</span>
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
                  {deporte === 'todos' ? 'Todos los deportes' : NOMBRE_DEPORTE[deporte]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="filtros-grupo">
          <span className="filtros-grupo__etiqueta">Nivel de exigencia física:</span>
          <div className="filtros-nivel" role="group" aria-label="Filtrar por nivel de exigencia">
            {NIVELES_FILTRO.map((nivel) => {
              const activo = nivelActivo === nivel;
              return (
                <button
                  key={nivel}
                  type="button"
                  className={activo ? 'filtro filtro--activo' : 'filtro'}
                  aria-pressed={activo}
                  onClick={() => seleccionarNivel(nivel)}
                >
                  {nivel === 'todos' ? 'Todos los niveles' : NOMBRE_NIVEL[nivel]}
                </button>
              );
            })}
          </div>
        </div>
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
          <p>
            {nivelActivo !== 'todos'
              ? MENSAJE_SIN_EVENTOS_NIVEL
              : MENSAJE_SIN_EVENTOS_CATEGORIA}
          </p>
          <div className="acciones-estado-vacio">
            {nivelActivo !== 'todos' && (
              <button
                type="button"
                className="boton boton--secundario boton--auto"
                onClick={() => seleccionarNivel('todos')}
              >
                Ver todos los niveles
              </button>
            )}
            {deporteActivo !== 'todos' && (
              <button
                type="button"
                className="boton boton--secundario boton--auto"
                onClick={() => seleccionarDeporte('todos')}
              >
                Ver todos los deportes
              </button>
            )}
            {(nivelActivo !== 'todos' || deporteActivo !== 'todos') && (
              <button
                type="button"
                className="boton boton--primario boton--auto"
                onClick={() => {
                  seleccionarNivel('todos');
                  seleccionarDeporte('todos');
                }}
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
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
