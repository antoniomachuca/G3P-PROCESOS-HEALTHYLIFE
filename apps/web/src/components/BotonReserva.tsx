import type { EstadoReserva, Evento, ReservaUsuario } from "../tipos";

export type VarianteBotonReserva = "primario" | "lista-espera" | "bloqueado";

export type VistaBotonReserva = {
  texto: string;
  bloqueado: boolean;
  variante: VarianteBotonReserva;
  mostrarIndicadorEspera: boolean;
  etiquetaEstadoEspera: string | null;
  textoTurno: string | null;
};

/** Formatea el número de turno en lista de espera según HU-14 (ej. "Turno #2"). */
export function formatearTurnoListaEspera(turno?: number | null): string | null {
  if (typeof turno !== "number" || !Number.isInteger(turno) || turno <= 0) {
    return null;
  }
  return `Turno #${turno}`;
}

/** Resuelve texto, bloqueo y estado visual del botón de reserva / lista de espera (HU-14 / G3P-101). */
export function resolverVistaBotonReserva({
  plazasDisponibles,
  reservando,
  reserva,
}: {
  plazasDisponibles: number;
  reservando: boolean;
  reserva?: ReservaUsuario;
}): VistaBotonReserva {
  const sinPlazas = plazasDisponibles <= 0;

  if (reservando) {
    return {
      texto: sinPlazas ? "Apuntándome..." : "Reservando...",
      bloqueado: true,
      variante: sinPlazas ? "lista-espera" : "primario",
      mostrarIndicadorEspera: false,
      etiquetaEstadoEspera: null,
      textoTurno: null,
    };
  }

  if (reserva?.estado === "confirmada") {
    return {
      texto: "Plaza confirmada",
      bloqueado: true,
      variante: "bloqueado",
      mostrarIndicadorEspera: false,
      etiquetaEstadoEspera: null,
      textoTurno: null,
    };
  }

  if (reserva?.estado === "en_espera") {
    return {
      texto: "En Espera",
      bloqueado: true,
      variante: "bloqueado",
      mostrarIndicadorEspera: true,
      etiquetaEstadoEspera: "En Espera",
      textoTurno: formatearTurnoListaEspera(reserva.turno),
    };
  }

  if (sinPlazas) {
    return {
      texto: "Apuntarme a lista de espera",
      bloqueado: false,
      variante: "lista-espera",
      mostrarIndicadorEspera: false,
      etiquetaEstadoEspera: null,
      textoTurno: null,
    };
  }

  return {
    texto: "Reservar plaza",
    bloqueado: false,
    variante: "primario",
    mostrarIndicadorEspera: false,
    etiquetaEstadoEspera: null,
    textoTurno: null,
  };
}

export function IndicadorListaEspera({
  turno,
  compacto = false,
}: {
  turno?: number | null;
  compacto?: boolean;
}) {
  const textoTurno = formatearTurnoListaEspera(turno);

  return (
    <div
      className={compacto ? "indicador-espera indicador-espera--compacto" : "indicador-espera"}
      role="status"
      aria-live="polite"
    >
      <span className="indicador-espera__estado">En Espera</span>
      <span className="indicador-espera__turno">{textoTurno ?? "En cola por orden de llegada"}</span>
    </div>
  );
}

export type BotonReservaProps = {
  evento: Pick<Evento, "plazasDisponibles">;
  reservando: boolean;
  reserva?: ReservaUsuario;
  estadoReserva?: EstadoReserva;
  turno?: number | null;
  onReservar: () => void;
  className?: string;
  mostrarIndicador?: boolean;
};

/**
 * Botón principal de inscripción y lista de espera (HU-14 / G3P-101):
 * - Con plazas libres: permite reservar plaza.
 * - Con 0 plazas libres: muestra "Apuntarme a lista de espera" habilitado.
 * - Si el usuario ya tiene reserva confirmada o está en lista de espera: aparece bloqueado
 *   evitando duplicados y, si está en espera, muestra su estado "En Espera" y su turno.
 */
export function BotonReserva({
  evento,
  reservando,
  reserva,
  estadoReserva,
  turno,
  onReservar,
  className = "",
  mostrarIndicador = true,
}: BotonReservaProps) {
  const reservaEfectiva: ReservaUsuario | undefined =
    reserva ?? (estadoReserva ? { estado: estadoReserva, turno } : undefined);

  const vista = resolverVistaBotonReserva({
    plazasDisponibles: evento.plazasDisponibles,
    reservando,
    reserva: reservaEfectiva,
  });

  const claseVariante =
    vista.variante === "lista-espera" ? "boton--lista-espera" : "boton--primario";
  const clasesBoton = `boton ${claseVariante} boton--reserva ${className}`.trim();

  function manejarClick() {
    if (vista.bloqueado) return;
    onReservar();
  }

  return (
    <div className="reserva-control">
      <button
        className={clasesBoton}
        type="button"
        onClick={manejarClick}
        disabled={vista.bloqueado}
        aria-disabled={vista.bloqueado}
      >
        {vista.texto}
      </button>
      {mostrarIndicador && vista.mostrarIndicadorEspera && (
        <IndicadorListaEspera turno={reservaEfectiva?.turno} />
      )}
    </div>
  );
}
