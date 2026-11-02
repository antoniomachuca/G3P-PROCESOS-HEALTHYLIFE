import { useState } from 'react';
import { eventoYaIniciado } from '../cancelacion';
import { ModalConfirmacionCancelacion } from './ModalConfirmacionCancelacion';

export type BotonCancelarInscripcionProps = {
  eventoId: string;
  inicioIso: string;
  tituloEvento: string;
  onConfirmarCancelacion?: (eventoId: string) => void;
  fechaReferencia?: Date | number;
  textoBoton?: string;
  className?: string;
};

/**
 * Botón para cancelar inscripción en un evento con verificación visual por fecha (G3P-59).
 * - Si el evento ya ha comenzado, se muestra inhabilitado (disabled) y con aviso explicativo.
 * - Si el evento está en el futuro, abre un modal de confirmación para evitar pulsaciones accidentales.
 */
export function BotonCancelarInscripcion({
  eventoId,
  inicioIso,
  tituloEvento,
  onConfirmarCancelacion,
  fechaReferencia,
  textoBoton = 'Cancelar inscripción',
  className = '',
}: BotonCancelarInscripcionProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const yaIniciado = eventoYaIniciado(inicioIso, fechaReferencia);

  function manejarClick() {
    if (yaIniciado) return;
    setModalAbierto(true);
  }

  function manejarDescartar() {
    setModalAbierto(false);
  }

  function manejarConfirmar() {
    setModalAbierto(false);
    if (onConfirmarCancelacion) {
      onConfirmarCancelacion(eventoId);
    }
  }

  const clasesBoton = `boton boton--cancelar ${className}`.trim();
  const mensajeBloqueo = 'No es posible cancelar una actividad ya iniciada';

  return (
    <div className="cancelar-contenedor">
      <button
        type="button"
        className={clasesBoton}
        disabled={yaIniciado}
        aria-disabled={yaIniciado}
        title={yaIniciado ? mensajeBloqueo : undefined}
        aria-label={yaIniciado ? mensajeBloqueo : textoBoton}
        onClick={manejarClick}
      >
        {textoBoton}
      </button>

      {yaIniciado && (
        <span className="cancelar-aviso-bloqueo" role="status">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <span>{mensajeBloqueo}</span>
        </span>
      )}

      <ModalConfirmacionCancelacion
        abierto={modalAbierto}
        tituloEvento={tituloEvento}
        onDescartar={manejarDescartar}
        onConfirmar={manejarConfirmar}
      />
    </div>
  );
}
