import { useEffect } from "react";

type Props = {
  abierto: boolean;
  mensaje: string;
  onCerrar: () => void;
};

/** HU-08 / G3P-58: alerta modal cuando la API rechaza la edición por conflicto de aforo (409). */
export function ModalConflictoAforo({ abierto, mensaje, onCerrar }: Props) {
  useEffect(() => {
    if (!abierto) return;
    function manejarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", manejarTeclado);
    return () => window.removeEventListener("keydown", manejarTeclado);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div className="modal-telon" role="presentation" onClick={onCerrar}>
      <div
        className="modal-dialogo"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-aforo-titulo"
        aria-describedby="modal-aforo-descripcion"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="modal-dialogo__ceja">Cambios no guardados</p>
        <h3 id="modal-aforo-titulo" className="modal-dialogo__titulo">
          No se puede reducir tanto la capacidad
        </h3>
        <p id="modal-aforo-descripcion" className="modal-dialogo__descripcion">
          {mensaje.replace(/\.?$/, ".")} Aumenta la capacidad o mantén la actual para guardar el resto de cambios.
        </p>
        <div className="modal-dialogo__acciones">
          <button type="button" className="boton boton--primario" onClick={onCerrar} autoFocus>
            Revisar capacidad
          </button>
        </div>
      </div>
    </div>
  );
}
