import type { ReactNode } from "react";

export function PanelAccionesEvento({ soloLectura, children }: { soloLectura: boolean; children: ReactNode }) {
  if (soloLectura) {
    return (
      <aside className="reserva-panel reserva-panel--solo-lectura" aria-label="Actividad en modo de solo lectura">
        <p className="ceja">Historial deportivo</p>
        <p>La actividad ha concluido. Esta ficha se muestra en modo de solo lectura.</p>
      </aside>
    );
  }

  return children;
}
