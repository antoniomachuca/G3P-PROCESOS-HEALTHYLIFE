import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ApiError, cargarEvento } from "../api";
import {
  cambiosDesdeFormulario,
  cuerpoActualizacion,
  errorDeGuardado,
  valoresFormularioEdicion,
  type CuerpoActualizacion,
  type ErrorGuardado,
} from "../edicion";
import { NOMBRE_DEPORTE } from "../formato";
import type { Evento, Nivel } from "../tipos";
import { ModalConflictoAforo } from "./ModalConflictoAforo";

const NIVELES: Array<{ valor: Nivel; texto: string }> = [
  { valor: "iniciacion", texto: "Iniciación" },
  { valor: "intermedio", texto: "Intermedio" },
  { valor: "competicion", texto: "Competición" },
];

type Props = {
  eventoId: string;
  /** Envía los cambios. Si la API los rechaza debe lanzar el error para que el formulario lo muestre. */
  onGuardar: (eventoId: string, cuerpo: CuerpoActualizacion) => void | Promise<void>;
  onCancelar: () => void;
};

/** HU-08 / G3P-55: carga el evento desde la API (SQLite) y muestra el formulario precargado. */
export function FormularioEdicionEvento({ eventoId, onGuardar, onCancelar }: Props) {
  const [evento, setEvento] = useState<Evento | null>(null);
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vigente = true;
    setEvento(null);
    setError("");
    cargarEvento(eventoId)
      .then((leido) => vigente && setEvento(leido))
      .catch((fallo) => {
        if (!vigente) return;
        setError(fallo instanceof ApiError ? fallo.message : "No se ha podido contactar con el servicio de actividades.");
      });
    return () => {
      vigente = false;
    };
  }, [eventoId, intento]);

  return (
    <main className="contenido contenido--ficha">
      <button className="enlace-volver" type="button" onClick={onCancelar}>
        Volver a la ficha
      </button>
      {error ? (
        <div className="estado-pagina estado-pagina--error" role="alert">
          <p>{error}</p>
          <button className="boton boton--secundario" type="button" onClick={() => setIntento((n) => n + 1)}>
            Reintentar
          </button>
        </div>
      ) : !evento ? (
        <div className="estado-pagina" role="status">
          Cargando datos de la actividad...
        </div>
      ) : (
        <CamposEdicionEvento evento={evento} onGuardar={(cuerpo) => onGuardar(evento.id, cuerpo)} onCancelar={onCancelar} />
      )}
    </main>
  );
}

type PropsCampos = {
  evento: Evento;
  onGuardar: (cuerpo: CuerpoActualizacion) => void | Promise<void>;
  onCancelar: () => void;
  /** Error inicial, solo para pruebas de render. */
  errorInicial?: ErrorGuardado | null;
};

export function CamposEdicionEvento({ evento, onGuardar, onCancelar, errorInicial = null }: PropsCampos) {
  const inicial = valoresFormularioEdicion(evento);
  const [guardando, setGuardando] = useState(false);
  const [errorGuardado, setErrorGuardado] = useState<ErrorGuardado | null>(errorInicial);
  const campoAforo = useRef<HTMLInputElement>(null);

  const cerrarModalAforo = useCallback(() => {
    setErrorGuardado(null);
    campoAforo.current?.focus();
    campoAforo.current?.select();
  }, []);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const texto = (campo: string) => String(datos.get(campo) ?? "");
    const cambios = cambiosDesdeFormulario({
      ...inicial,
      titulo: texto("titulo"),
      descripcion: texto("descripcion"),
      fecha: texto("fecha"),
      horaInicio: texto("horaInicio"),
      horaFin: texto("horaFin"),
      puntoEncuentro: texto("puntoEncuentro"),
      nivel: texto("nivel") as Nivel,
      material: texto("material"),
      aforoMaximo: Number.parseInt(texto("aforoMaximo"), 10),
    });
    setGuardando(true);
    setErrorGuardado(null);
    try {
      await onGuardar(cuerpoActualizacion(cambios, evento));
    } catch (error) {
      // Lo escrito se conserva: el formulario no se recarga al fallar.
      setErrorGuardado(errorDeGuardado(error));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <div className="ficha-titulo formulario-edicion__cabecera">
        <p className="ceja">Organización</p>
        <h1>Editar actividad</h1>
        <p>Modifica los datos de «{evento.titulo}». Los campos bloqueados no se pueden cambiar.</p>
      </div>

      <form className="formulario-edicion" onSubmit={(e) => void enviar(e)} aria-label="Formulario de edición de la actividad">
        <fieldset className="formulario-edicion__grupo">
          <legend>Datos de la actividad</legend>
          <label className="campo campo--ancho">
            <span className="campo__etiqueta">Título del evento *</span>
            <input required name="titulo" type="text" defaultValue={inicial.titulo} />
          </label>
          <label className="campo campo--ancho">
            <span className="campo__etiqueta">Descripción *</span>
            <textarea required name="descripcion" rows={4} defaultValue={inicial.descripcion} />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Nivel requerido *</span>
            <select required name="nivel" defaultValue={inicial.nivel}>
              {NIVELES.map((nivel) => (
                <option key={nivel.valor} value={nivel.valor}>
                  {nivel.texto}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Material necesario (separado por comas)</span>
            <input name="material" type="text" defaultValue={inicial.material} placeholder="Ej: Esterilla, Toalla" />
          </label>
        </fieldset>

        <fieldset className="formulario-edicion__grupo">
          <legend>Fecha y lugar</legend>
          <label className="campo">
            <span className="campo__etiqueta">Fecha *</span>
            <input required name="fecha" type="date" defaultValue={inicial.fecha} />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Hora de inicio *</span>
            <input required name="horaInicio" type="time" defaultValue={inicial.horaInicio} />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Hora de fin *</span>
            <input required name="horaFin" type="time" defaultValue={inicial.horaFin} />
          </label>
          <label className="campo campo--ancho">
            <span className="campo__etiqueta">Punto de encuentro exacto *</span>
            <input required name="puntoEncuentro" type="text" defaultValue={inicial.puntoEncuentro} />
          </label>
          <label className="campo campo--solo-lectura">
            <span className="campo__etiqueta">Tipo de deporte</span>
            <input name="deporte" type="text" value={NOMBRE_DEPORTE[inicial.deporte]} readOnly disabled />
          </label>
          <label className="campo campo--solo-lectura">
            <span className="campo__etiqueta">Lugar (campus)</span>
            <input name="lugar" type="text" value={inicial.lugar} readOnly disabled />
          </label>
        </fieldset>

        <fieldset className="formulario-edicion__grupo">
          <legend>Aforo</legend>
          <label className="campo">
            <span className="campo__etiqueta">Capacidad total *</span>
            <input
              ref={campoAforo}
              required
              name="aforoMaximo"
              type="number"
              min={Math.max(1, inicial.plazasOcupadas)}
              step={1}
              defaultValue={inicial.aforoMaximo}
            />
          </label>
          <label className="campo campo--solo-lectura">
            <span className="campo__etiqueta">Plazas ocupadas</span>
            <input name="plazasOcupadas" type="number" value={inicial.plazasOcupadas} readOnly disabled />
          </label>
        </fieldset>

        {errorGuardado?.tipo === "general" && (
          <div className="formulario-edicion__error" role="alert">
            {errorGuardado.mensaje}
          </div>
        )}

        <div className="formulario-edicion__acciones">
          <button type="submit" className="boton boton--primario" disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cambios"}
          </button>
          <button type="button" className="boton boton--secundario" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
        </div>
      </form>

      <ModalConflictoAforo
        abierto={errorGuardado?.tipo === "aforo"}
        mensaje={errorGuardado?.mensaje ?? ""}
        onCerrar={cerrarModalAforo}
      />
    </>
  );
}
