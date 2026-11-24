import { useState } from "react";
import { ApiError, crearEvento } from "./api";
import { isoEnMadrid } from "./edicion";
import type { Evento } from "./tipos";

type FormularioEventoProps = {
  onCreado: (evento: Evento) => void;
  onCancelar: () => void;
};

export type DatosFormularioCreacion = {
  titulo: string;
  descripcion: string;
  deporte: Evento["deporte"];
  nivel: Evento["nivel"];
  fecha: string;
  hora: string;
  duracion: string;
  lugarNombre: string;
  lugarPuntoEncuentro: string;
  lugarMunicipio: string;
  lugarDireccion: string;
  aforoMaximo: string;
  aforoMinimo: string;
  fechaLimite: string;
  horaLimite: string;
  material: string;
  organizadorId: string;
};

export type PayloadCreacionEvento = Omit<Evento, "id" | "estado" | "plazasDisponibles">;

/** HU-11 / G3P-97: construye y valida el payload de alta incluyendo aforo mínimo y límite de inscripción. */
export function construirPayloadCreacion(datos: DatosFormularioCreacion): PayloadCreacionEvento {
  const duracionHoras = Number.parseInt(datos.duracion, 10) || 1;
  const inicioIso = isoEnMadrid(datos.fecha, datos.hora);
  const finDate = new Date(Date.parse(inicioIso) + duracionHoras * 3_600_000);
  const aforoMaximo = Number.parseInt(datos.aforoMaximo, 10);

  let aforoMinimo: number | null = null;
  const minimoRaw = datos.aforoMinimo.trim();
  if (minimoRaw !== "") {
    const minimo = Number(minimoRaw);
    if (!Number.isInteger(minimo) || minimo < 1) {
      throw new Error("El aforo mínimo debe ser un número entero mayor que cero.");
    }
    if (Number.isFinite(aforoMaximo) && minimo > aforoMaximo) {
      throw new Error("El aforo mínimo no puede superar el aforo máximo.");
    }
    aforoMinimo = minimo;
  }

  let fechaLimiteInscripcion: string | null = null;
  const fechaLimiteRaw = datos.fechaLimite.trim();
  const horaLimiteRaw = datos.horaLimite.trim();
  if (fechaLimiteRaw !== "" && horaLimiteRaw === "") {
    throw new Error("Indica también la hora límite de inscripción.");
  }
  if (horaLimiteRaw !== "") {
    const diaLimite = fechaLimiteRaw !== "" ? fechaLimiteRaw : datos.fecha;
    fechaLimiteInscripcion = isoEnMadrid(diaLimite, horaLimiteRaw);
    if (Date.parse(fechaLimiteInscripcion) >= Date.parse(inicioIso)) {
      throw new Error("La fecha límite de inscripción debe ser anterior al inicio del evento.");
    }
  }

  return {
    titulo: datos.titulo.trim(),
    descripcion: datos.descripcion.trim(),
    deporte: datos.deporte,
    nivel: datos.nivel,
    inicio: inicioIso,
    fin: finDate.toISOString(),
    lugar: {
      nombre: datos.lugarNombre.trim(),
      puntoEncuentro: datos.lugarPuntoEncuentro.trim(),
      municipio: datos.lugarMunicipio.trim(),
      direccion: datos.lugarDireccion.trim(),
      lat: 40.4168,
      lng: -3.7038,
    },
    aforoMaximo,
    aforoMinimo,
    fechaLimiteInscripcion,
    material: datos.material ? datos.material.split(",").map((i) => i.trim()).filter(Boolean) : [],
    organizadorId: datos.organizadorId,
    communityGroupId: null,
    routineId: null,
  };
}

export function FormularioEvento({ onCreado, onCancelar }: FormularioEventoProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const hoy = new Date().toISOString().split("T")[0];

  const manejarEnvio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    const formData = new FormData(e.currentTarget);
    const campo = (nombre: string) => String(formData.get(nombre) ?? "");

    let nuevo: PayloadCreacionEvento;
    try {
      nuevo = construirPayloadCreacion({
        titulo: campo("titulo"),
        descripcion: campo("descripcion"),
        deporte: campo("deporte") as Evento["deporte"],
        nivel: campo("nivel") as Evento["nivel"],
        fecha: campo("fecha"),
        hora: campo("hora"),
        duracion: campo("duracion"),
        lugarNombre: campo("lugar_nombre"),
        lugarPuntoEncuentro: campo("lugar_punto_encuentro"),
        lugarMunicipio: campo("lugar_municipio"),
        lugarDireccion: campo("lugar_direccion"),
        aforoMaximo: campo("aforoMaximo"),
        aforoMinimo: campo("aforoMinimo"),
        fechaLimite: campo("fechaLimite"),
        horaLimite: campo("horaLimite"),
        material: campo("material"),
        organizadorId: import.meta.env.VITE_DEMO_USER_ID ?? "usr_mock_010",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revisa los datos introducidos.");
      return;
    }

    setCargando(true);
    try {
      const eventoCreado = await crearEvento(nuevo);
      onCreado(eventoCreado);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error inesperado al crear el evento.");
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="contenido contenido--ficha">
      <button className="enlace-volver" type="button" onClick={onCancelar}>
        ← Volver al catálogo
      </button>

      <div className="ficha-cabecera" style={{ paddingBottom: '20px', borderBottom: 'none' }}>
        <div className="ficha-titulo">
          <p className="ceja">Organización</p>
          <h1>Publicar actividad deportiva</h1>
        </div>
      </div>

      {error && (
        <div className="aviso aviso--error" style={{ position: 'relative', width: '100%', right: 'auto', bottom: 'auto', marginBottom: '20px' }}>
          <span>{error}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setError("")}>×</button>
        </div>
      )}

      <form className="reserva-panel" onSubmit={manejarEnvio} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Título del evento *</label>
          <input required name="titulo" type="text" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Ej: Running matutino en el Retiro" />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Descripción</label>
          <textarea required name="descripcion" className="filtro" style={{ width: '100%', padding: '8px', minHeight: '80px' }} placeholder="Detalles de la sesión..." />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Deporte *</label>
            <select required name="deporte" className="filtro" style={{ width: '100%', padding: '8px' }}>
              <option value="futbol">Fútbol</option>
              <option value="running">Running</option>
              <option value="padel">Pádel</option>
              <option value="natacion">Natación</option>
              <option value="yoga">Yoga</option>
              <option value="ciclismo">Ciclismo</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Nivel *</label>
            <select required name="nivel" className="filtro" style={{ width: '100%', padding: '8px' }}>
              <option value="iniciacion">Iniciación</option>
              <option value="intermedio">Intermedio</option>
              <option value="competicion">Competición</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', padding: '10px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--urjc-black)', textTransform: 'uppercase' }}>
              Fecha *
            </label>
            <input 
              required 
              name="fecha" 
              type="date" 
              className="filtro" 
              min={new Date().toISOString().split("T")[0]}
              style={{ width: '100%', padding: '10px 12px', fontSize: '15px', color: 'var(--urjc-black)', cursor: 'pointer' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--urjc-black)', textTransform: 'uppercase' }}>
              Hora de inicio *
            </label>
            <input 
              required 
              name="hora" 
              type="time" 
              className="filtro" 
              style={{ width: '100%', padding: '10px 12px', fontSize: '15px', color: 'var(--urjc-black)', cursor: 'pointer' }} 
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--urjc-black)', textTransform: 'uppercase' }}>
              Duración (horas)
            </label>
            <input 
              required 
              name="duracion" 
              type="number" 
              min="1" 
              defaultValue="1" 
              className="filtro" 
              style={{ width: '100%', padding: '10px 12px', fontSize: '15px' }} 
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Lugar: Nombre *</label>
            <input required name="lugar_nombre" type="text" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Ej: Polideportivo Sur" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Lugar: Punto de encuentro *</label>
            <input required name="lugar_punto_encuentro" type="text" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Ej: Puerta principal" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Municipio *</label>
            <input required name="lugar_municipio" type="text" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Ej: Fuenlabrada" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Dirección *</label>
            <input required name="lugar_direccion" type="text" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Calle..." />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Aforo máximo *</label>
            <input required name="aforoMaximo" type="number" min="1" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="10" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Aforo mínimo (opcional)</label>
            <input name="aforoMinimo" type="number" min="1" step="1" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Ej: 10 jugadores" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Fecha límite de inscripción (opcional)</label>
            <input name="fechaLimite" type="date" min={hoy} className="filtro" style={{ width: '100%', padding: '8px' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Hora límite de inscripción (opcional)</label>
            <input name="horaLimite" type="time" className="filtro" style={{ width: '100%', padding: '8px' }} />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Material necesario (separado por comas)</label>
          <input name="material" type="text" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Ej: Esterilla, Toalla" />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button type="submit" className="boton boton--primario" disabled={cargando}>
            {cargando ? "Publicando..." : "Publicar evento"}
          </button>
          <button type="button" className="boton boton--secundario" onClick={onCancelar} disabled={cargando}>
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}
