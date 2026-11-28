import { useState } from "react";
import type { Evento } from "../tipos";
import { estadoOpcionCancelacion, inscritosDelEvento } from "../cancelacion-evento";
import { ModalCancelacionEvento } from "./ModalCancelacionEvento";

export type BotonCancelarEventoProps = {
  evento: Evento;
  onCancelar: (eventoId: string, motivo: string) => Promise<void>;
  fechaReferencia?: Date | number;
};

/**
 * HU-09 / G3P-80: opción «Cancelar actividad» del organizador en la ficha.
 * Si la actividad ya terminó (o ya está cancelada) el botón sale desactivado con la razón visible.
 */
export function BotonCancelarEvento({ evento, onCancelar, fechaReferencia }: BotonCancelarEventoProps) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const opcion = estadoOpcionCancelacion(evento, fechaReferencia);

  return (
    <div className="cancelar-contenedor cancelar-contenedor--evento">
      <button
        type="button"
        className="boton boton--cancelar"
        disabled={!opcion.habilitada}
        aria-disabled={!opcion.habilitada}
        title={opcion.habilitada ? undefined : opcion.razon}
        onClick={() => opcion.habilitada && setModalAbierto(true)}
      >
        Cancelar actividad
      </button>

      {!opcion.habilitada && (
        <span className="cancelar-aviso-bloqueo" role="status">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
          <span>{opcion.razon}</span>
        </span>
      )}

      <ModalCancelacionEvento
        abierto={modalAbierto}
        tituloEvento={evento.titulo}
        inscritos={inscritosDelEvento(evento)}
        onDescartar={() => setModalAbierto(false)}
        onConfirmar={async (motivo) => {
          await onCancelar(evento.id, motivo);
          setModalAbierto(false);
        }}
      />
    </div>
  );
}
