import { useCallback, useEffect, useState } from "react";
import { cargarHistorico } from "../api";
import type { EstadoPanel } from "./PanelMisActividades";
import { TarjetaMiActividad } from "./PanelMisActividades";
import type { Evento } from "../tipos";

export function VistaPanelHistorico({
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
    <main id="historico" className="contenido contenido--panel">
      <section className="presentacion">
        <div>
          <p className="ceja">Mi actividad deportiva</p>
          <h1>Histórico</h1>
          <p className="presentacion__bajada">
            Tus actividades anteriores, de la más reciente a la más antigua.
          </p>
        </div>
        {estado.tipo === "listo" && estado.eventos.length > 0 && (
          <div className="resumen-catalogo" aria-label="Resumen del historial">
            <div>
              <strong>{estado.eventos.length}</strong>
              <span>{estado.eventos.length === 1 ? "actividad registrada" : "actividades registradas"}</span>
            </div>
          </div>
        )}
      </section>

      {estado.tipo === "cargando" && (
        <div className="estado-pagina" role="status">
          Cargando tu historial deportivo...
        </div>
      )}

      {estado.tipo === "error" && (
        <div className="estado-pagina estado-pagina--error" role="alert">
          <p>No se ha podido cargar tu historial. Comprueba tu conexión e inténtalo de nuevo.</p>
          <button className="boton boton--secundario" type="button" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      )}

      {estado.tipo === "listo" && estado.eventos.length === 0 && (
        <div className="estado-pagina estado-pagina--vacio">
          <p>Aún no tienes registros en tu historial deportivo.</p>
          <a className="boton boton--primario" href="#catalogo" onClick={onExplorarCatalogo}>
            Explorar actividades
          </a>
        </div>
      )}

      {estado.tipo === "listo" && estado.eventos.length > 0 && (
        <ul className="lista-mis-actividades" aria-label="Historial deportivo">
          {estado.eventos.map((evento) => (
            <TarjetaMiActividad
              key={evento.id}
              evento={evento}
              onAbrir={onAbrir}
              textoEstado="Actividad pasada"
              historica
            />
          ))}
        </ul>
      )}

      <footer className="pie">Universidad Rey Juan Carlos · Healthy Life</footer>
    </main>
  );
}

export function PanelHistorico({
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
    cargarHistorico(usuarioId)
      .then((eventos) => setEstado({ tipo: "listo", eventos }))
      .catch(() => setEstado({ tipo: "error" }));
  }, [usuarioId]);

  useEffect(cargar, [cargar]);

  return (
    <VistaPanelHistorico
      estado={estado}
      onAbrir={onAbrir}
      onReintentar={cargar}
      onExplorarCatalogo={onExplorarCatalogo}
    />
  );
}
