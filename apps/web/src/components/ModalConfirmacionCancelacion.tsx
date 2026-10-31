import { useEffect } from 'react';

export type ModalConfirmacionCancelacionProps = {
  abierto: boolean;
  tituloEvento: string;
  onConfirmar: () => void;
  onDescartar: () => void;
};

/**
 * Diálogo modal accesible para confirmar la anulación voluntaria de plaza (G3P-59).
 * Previene pulsaciones accidentales y sigue la identidad visual corporativa de la URJC.
 */
export function ModalConfirmacionCancelacion({
  abierto,
  tituloEvento,
  onConfirmar,
  onDescartar,
}: ModalConfirmacionCancelacionProps) {
  useEffect(() => {
    if (!abierto) return;

    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') {
        onDescartar();
      }
    }

    window.addEventListener('keydown', manejarTeclado);
    return () => window.removeEventListener('keydown', manejarTeclado);
  }, [abierto, onDescartar]);

  if (!abierto) return null;

  return (
    <div
      className="modal-telon"
      role="presentation"
      onClick={onDescartar}
    >
      <div
        className="modal-dialogo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cancelar-titulo"
        aria-describedby="modal-cancelar-descripcion"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-dialogo__ceja">Confirmación de baja</p>
        <h3 id="modal-cancelar-titulo" className="modal-dialogo__titulo">
          ¿Deseas cancelar tu inscripción a este evento?
        </h3>
        <p id="modal-cancelar-descripcion" className="modal-dialogo__descripcion">
          Vas a cancelar tu plaza confirmada en <strong>«{tituloEvento}»</strong>.
          Al confirmar, liberarás tu plaza para que otro compañero pueda inscribirse.
        </p>

        <div className="modal-dialogo__acciones">
          <button
            type="button"
            className="boton boton--secundario"
            onClick={onDescartar}
          >
            Descartar
          </button>
          <button
            type="button"
            className="boton boton--peligro"
            onClick={onConfirmar}
          >
            Confirmar cancelación
          </button>
        </div>
      </div>
    </div>
  );
}
