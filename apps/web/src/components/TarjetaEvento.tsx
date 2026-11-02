import { useState } from 'react';
import type { EstadoReserva, Evento } from '../tipos';
import { NOMBRE_DEPORTE, estadoPlazas, fechaHora, textoCupo, textoInsignia } from '../formato';
import { IconoCalendario, IconoLugar, IconoReserva } from './Iconos';
import { BotonCancelarInscripcion } from './BotonCancelarInscripcion';

export type TarjetaEventoProps = {
  evento: Evento;
  tieneReserva?: boolean;
  estadoReserva?: EstadoReserva;
  onConfirmarCancelacion?: (eventoId: string) => void;
  onReservar?: () => void;
  onAbrir?: () => void;
  reservando?: boolean;
  fechaReferencia?: Date | number;
};

export function TarjetaEvento({
  evento,
  tieneReserva,
  estadoReserva,
  onConfirmarCancelacion,
  onReservar,
  onAbrir,
  reservando,
  fechaReferencia,
}: TarjetaEventoProps) {
  const [imagenRota, setImagenRota] = useState(false);
  const estado = estadoPlazas(evento.plazasDisponibles);
  const ocupadas = evento.aforoMaximo - evento.plazasDisponibles;
  const porcentaje = Math.min(100, Math.max(0, Math.round((ocupadas / evento.aforoMaximo) * 100)));
  const usuarioInscrito = Boolean(tieneReserva || estadoReserva);

  return (
    <article className="tarjeta">
      <div>
        <div className="tarjeta__imagen">
          {evento.imagenUrl && !imagenRota && (
            <img src={evento.imagenUrl} alt={evento.titulo} loading="lazy" onError={() => setImagenRota(true)} />
          )}

          <div className="tarjeta__insignias">
            <span className="insignia insignia--deporte">{NOMBRE_DEPORTE[evento.deporte].toUpperCase()}</span>
            <span className="insignia insignia--campus">{evento.lugar.municipio}</span>
          </div>

          <span className={`insignia insignia--estado insignia--${estado}`}>
            <span className={estado === 'ultimas' ? 'punto punto--ping' : 'punto'} />
            {textoInsignia(evento.plazasDisponibles)}
          </span>
        </div>

        <div className="tarjeta__cuerpo">
          <h3 className="tarjeta__titulo">{evento.titulo}</h3>

          <div className="tarjeta__datos">
            <div className="dato dato--fecha">
              <IconoCalendario />
              <span>{fechaHora(evento.inicio, evento.fin)}</span>
            </div>
            <div className="dato dato--lugar">
              <IconoLugar />
              <span>
                {evento.lugar.nombre} · Campus {evento.lugar.municipio}
              </span>
            </div>
          </div>

          <div className="cupo">
            <div className="cupo__fila">
              <span className="cupo__etiqueta">Aforo disponible</span>
              <span className="cupo__texto">{textoCupo(evento.plazasDisponibles, evento.aforoMaximo)}</span>
            </div>
            <div
              className="cupo__barra"
              role="img"
              aria-label={`${ocupadas} de ${evento.aforoMaximo} plazas ocupadas`}
            >
              <div className={`cupo__relleno cupo__relleno--${estado}`} style={{ width: `${porcentaje}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="tarjeta__acciones">
        {usuarioInscrito ? (
          <BotonCancelarInscripcion
            eventoId={evento.id}
            inicioIso={evento.inicio}
            tituloEvento={evento.titulo}
            onConfirmarCancelacion={onConfirmarCancelacion}
            fechaReferencia={fechaReferencia}
          />
        ) : (
          <>
            <button
              type="button"
              className="boton boton--secundario"
              onClick={onAbrir}
            >
              Ver detalle
            </button>
            <button
              type="button"
              className="boton boton--primario"
              onClick={onReservar}
              disabled={reservando || evento.plazasDisponibles <= 0}
            >
              <IconoReserva />
              <span>{reservando ? 'Reservando...' : 'Reservar'}</span>
            </button>
          </>
        )}
      </div>
    </article>
  );
}

