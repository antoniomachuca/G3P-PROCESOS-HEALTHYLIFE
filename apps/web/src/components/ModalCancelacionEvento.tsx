import { useEffect, useState } from "react";
import {
  LONGITUD_MAXIMA_DETALLE,
  MOTIVOS_CANCELACION,
  construirMotivo,
  type ClaveMotivo,
} from "../cancelacion-evento";

export type ModalCancelacionEventoProps = {
  abierto: boolean;
  tituloEvento: string;
  inscritos: number;
  /** Se llama con el motivo ya compuesto. Si la promesa falla, el modal muestra el error y sigue abierto. */
  onConfirmar: (motivo: string) => Promise<void>;
  onDescartar: () => void;
};

type Paso = "motivo" | "confirmar";

/**
 * HU-09 / G3P-80: diálogo en dos pasos para que el organizador cancele una actividad.
 * 1. Elige el motivo (lluvia, indisposición, cierre de pistas u otro con detalle obligatorio).
 * 2. Revisa el resumen y confirma. Hasta ese segundo clic no se llama a la API.
 */
export function ModalCancelacionEvento({ abierto, tituloEvento, inscritos, onConfirmar, onDescartar }: ModalCancelacionEventoProps) {
  const [paso, setPaso] = useState<Paso>("motivo");
  const [clave, setClave] = useState<ClaveMotivo | "">("");
  const [detalle, setDetalle] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!abierto) {
      setPaso("motivo");
      setClave("");
      setDetalle("");
      setError("");
      setEnviando(false);
      return;
    }
    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !enviando) onDescartar();
    }
    window.addEventListener("keydown", manejarTeclado);
    return () => window.removeEventListener("keydown", manejarTeclado);
  }, [abierto, enviando, onDescartar]);

  if (!abierto) return null;

  const resultado = construirMotivo(clave, detalle);

  function continuar() {
    if (!resultado.ok) {
      setError(resultado.error);
      return;
    }
    setError("");
    setPaso("confirmar");
  }

  async function confirmar() {
    if (!resultado.ok || enviando) return;
    setEnviando(true);
    setError("");
    try {
      await onConfirmar(resultado.motivo);
    } catch (fallo) {
      setError(fallo instanceof Error && fallo.message ? fallo.message : "No se ha podido cancelar la actividad.");
      setEnviando(false);
    }
  }

  const textoInscritos =
    inscritos === 0
      ? "No hay personas inscritas todavía."
      : inscritos === 1
        ? "Se informará a la persona inscrita y se liberará su plaza."
        : `Se informará a las ${inscritos} personas inscritas y se liberarán sus plazas.`;

  return (
    <div className="modal-telon" role="presentation" onClick={() => !enviando && onDescartar()}>
      <div
        className="modal-dialogo modal-dialogo--ancho"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cancelar-evento-titulo"
        aria-describedby="modal-cancelar-evento-descripcion"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-dialogo__ceja">Cancelar actividad · paso {paso === "motivo" ? "1" : "2"} de 2</p>

        {paso === "motivo" ? (
          <>
            <h3 id="modal-cancelar-evento-titulo" className="modal-dialogo__titulo">
              ¿Por qué cancelas esta actividad?
            </h3>
            <p id="modal-cancelar-evento-descripcion" className="modal-dialogo__descripcion">
              El motivo se comunicará a los inscritos en <strong>«{tituloEvento}»</strong>.
            </p>

            <fieldset className="motivos-cancelacion">
              <legend className="sr-only">Motivo de la cancelación</legend>
              {MOTIVOS_CANCELACION.map((motivo) => (
                <label key={motivo.clave} className={clave === motivo.clave ? "motivo-opcion motivo-opcion--activa" : "motivo-opcion"}>
                  <input
                    type="radio"
                    name="motivo-cancelacion"
                    value={motivo.clave}
                    checked={clave === motivo.clave}
                    onChange={() => {
                      setClave(motivo.clave);
                      setError("");
                    }}
                  />
                  <span>{motivo.texto}</span>
                </label>
              ))}
            </fieldset>

            <label className="campo">
              <span className="campo__etiqueta">
                {clave === "otro" ? "Detalle del motivo *" : "Detalle para los inscritos (opcional)"}
              </span>
              <textarea
                name="detalle-cancelacion"
                rows={3}
                maxLength={LONGITUD_MAXIMA_DETALLE}
                value={detalle}
                onChange={(e) => {
                  setDetalle(e.target.value);
                  setError("");
                }}
                placeholder="Por ejemplo: la AEMET anuncia tormenta a partir de las 9:00."
              />
              <span className="campo__ayuda">{detalle.trim().length} / {LONGITUD_MAXIMA_DETALLE}</span>
            </label>
          </>
        ) : (
          <>
            <h3 id="modal-cancelar-evento-titulo" className="modal-dialogo__titulo">
              ¿Confirmas la cancelación de «{tituloEvento}»?
            </h3>
            <div id="modal-cancelar-evento-descripcion" className="modal-dialogo__descripcion">
              <p className="resumen-cancelacion__motivo">
                <span>Motivo</span>
                <strong>{resultado.ok ? resultado.motivo : ""}</strong>
              </p>
              <ul className="resumen-cancelacion__efectos">
                <li>La actividad pasará a estado «Cancelada» y dejará de aparecer en el catálogo.</li>
                <li>{textoInscritos}</li>
                <li>Esta acción no se puede deshacer.</li>
              </ul>
            </div>
          </>
        )}

        {error && (
          <p className="modal-dialogo__error" role="alert">
            {error}
          </p>
        )}

        <div className="modal-dialogo__acciones">
          {paso === "motivo" ? (
            <>
              <button type="button" className="boton boton--secundario" onClick={onDescartar}>
                Volver sin cancelar
              </button>
              <button type="button" className="boton boton--peligro" onClick={continuar}>
                Continuar
              </button>
            </>
          ) : (
            <>
              <button type="button" className="boton boton--secundario" disabled={enviando} onClick={() => setPaso("motivo")}>
                Cambiar motivo
              </button>
              <button type="button" className="boton boton--peligro" disabled={enviando} onClick={() => void confirmar()}>
                {enviando ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
