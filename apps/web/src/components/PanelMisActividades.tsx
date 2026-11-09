import { useCallback, useEffect, useState } from "react";
import { cargarMisActividades } from "../api";
import { NOMBRE_DEPORTE, fechaHora } from "../formato";
import type { Evento } from "../tipos";
import { IconoCalendario, IconoLugar } from "./Iconos";

export type EstadoPanel =
  | { tipo: "cargando" }
  | { tipo: "error" }
  | { tipo: "listo"; eventos: Evento[] };

/** Tarjeta de una actividad confirmada (G3P-51). Toda la tarjeta abre la ficha (G3P-54). */
export function TarjetaMiActividad({ evento, onAbrir }: { evento: Evento; onAbrir: (evento: Evento) => void }) {
  return (
    <li className="mi-actividad">
      <button
        type="button"
        className="mi-actividad__boton"
        onClick={() => onAbrir(evento)}
        aria-label={`Ver ficha de ${evento.titulo}`}
      >
        <span className="mi-actividad__cabecera">
          <span className="insignia insignia--deporte">{NOMBRE_DEPORTE[evento.deporte].toUpperCase()}</span>
          <span className="mi-actividad__estado">Plaza confirmada</span>
        </span>
        <span className="mi-actividad__titulo">{evento.titulo}</span>
        <span className="mi-actividad__dato">
          <IconoCalendario />
          <span>{fechaHora(evento.inicio, evento.fin)}</span>
        </span>
        <span className="mi-actividad__dato">
          <IconoLugar />
          <span>
            {evento.lugar.nombre} · Campus {evento.lugar.municipio}
          </span>
        </span>
      </button>
    </li>
  );
}

/** Vista pura del panel: recibe el estado ya resuelto, sin efectos (se prueba sin red). */
export function VistaPanelMisActividades({
  estado,
  onAbrir,
  onReintentar,
  onExplorarCatalogo,
}: {
  estado: EstadoPanel;
  onAbrir: (evento: Evento) => void;
  onReintentar: () => void;
  onExplorarCatalogo: () => void;
}) {
  return (
    <main id="mis-actividades" className="contenido contenido--panel">
      <section className="presentacion">
        <div>
          <p className="ceja">Mi agenda deportiva</p>
          <h1>Mis actividades</h1>
          <p className="presentacion__bajada">Tus próximas actividades con plaza confirmada, por orden de fecha.</p>
        </div>
        {estado.tipo === "listo" && estado.eventos.length > 0 && (
          <div className="resumen-catalogo" aria-label="Resumen de mis actividades">
            <div>
              <strong>{estado.eventos.length}</strong>
              <span>{estado.eventos.length === 1 ? "actividad programada" : "actividades programadas"}</span>
            </div>
          </div>
        )}
      </section>

      {estado.tipo === "cargando" && (
        <div className="estado-pagina" role="status">
          Cargando tus actividades...
        </div>
      )}

      {estado.tipo === "error" && (
        <div className="estado-pagina estado-pagina--error" role="alert">
          <p>No se han podido cargar tus actividades. Comprueba tu conexión e inténtalo de nuevo.</p>
          <button className="boton boton--secundario" type="button" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      )}

      {estado.tipo === "listo" && estado.eventos.length === 0 && (
        <div className="estado-pagina estado-pagina--vacio">
          <p>No tienes reservas programadas.</p>
          <a className="boton boton--primario" href="#catalogo" onClick={onExplorarCatalogo}>
            Explorar el catálogo de actividades
          </a>
        </div>
      )}

      {estado.tipo === "listo" && estado.eventos.length > 0 && (
        <ul className="lista-mis-actividades" aria-label="Mis actividades confirmadas">
          {estado.eventos.map((evento) => (
            <TarjetaMiActividad key={evento.id} evento={evento} onAbrir={onAbrir} />
          ))}
        </ul>
      )}

      <footer className="pie">Universidad Rey Juan Carlos · Healthy Life</footer>
    </main>
  );
}

/** Panel personal de Mis Actividades (HU-17 / G3P-28). */
export function PanelMisActividades({
  usuarioId,
  onAbrir,
  onExplorarCatalogo,
}: {
  usuarioId: string;
  onAbrir: (evento: Evento) => void;
  onExplorarCatalogo: () => void;
}) {
  const [estado, setEstado] = useState<EstadoPanel>({ tipo: "cargando" });

  const cargar = useCallback(() => {
    setEstado({ tipo: "cargando" });
    cargarMisActividades(usuarioId)
      .then((eventos) => setEstado({ tipo: "listo", eventos }))
      .catch(() => setEstado({ tipo: "error" }));
  }, [usuarioId]);

  useEffect(cargar, [cargar]);

  return (
    <VistaPanelMisActividades
      estado={estado}
      onAbrir={onAbrir}
      onReintentar={cargar}
      onExplorarCatalogo={onExplorarCatalogo}
    />
  );
}
