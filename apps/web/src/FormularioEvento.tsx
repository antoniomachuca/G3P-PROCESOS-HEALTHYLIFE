import { useState } from "react";
import { ApiError, crearEvento } from "./api";
import type { Evento } from "./tipos";

type FormularioEventoProps = {
  onCreado: (evento: Evento) => void;
  onCancelar: () => void;
};

export function FormularioEvento({ onCreado, onCancelar }: FormularioEventoProps) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const manejarEnvio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setCargando(true);

    const formData = new FormData(e.currentTarget);
    const materialRaw = formData.get("material") as string;
    
    // Concatenar inicio y hora
    const fecha = formData.get("fecha") as string;
    const hora = formData.get("hora") as string;
    const duracionHoras = parseInt(formData.get("duracion") as string) || 1;
    
    const inicio = new Date(`${fecha}T${hora}:00`);
    const fin = new Date(inicio.getTime() + duracionHoras * 3600000);

    const nuevo = {
      titulo: formData.get("titulo") as string,
      descripcion: formData.get("descripcion") as string,
      deporte: formData.get("deporte") as Evento["deporte"],
      nivel: formData.get("nivel") as Evento["nivel"],
      inicio: inicio.toISOString(),
      fin: fin.toISOString(),
      lugar: {
        nombre: formData.get("lugar_nombre") as string,
        puntoEncuentro: formData.get("lugar_punto_encuentro") as string,
        municipio: formData.get("lugar_municipio") as string,
        direccion: formData.get("lugar_direccion") as string,
        lat: 40.4168,
        lng: -3.7038
      },
      aforoMaximo: parseInt(formData.get("aforoMaximo") as string, 10),
      material: materialRaw ? materialRaw.split(",").map(i => i.trim()).filter(Boolean) : [],
      organizadorId: import.meta.env.VITE_DEMO_USER_ID ?? "usr_mock_010",
      communityGroupId: null,
      routineId: null
    };

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
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Material necesario (separado por comas)</label>
            <input name="material" type="text" className="filtro" style={{ width: '100%', padding: '8px' }} placeholder="Ej: Esterilla, Toalla" />
          </div>
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
