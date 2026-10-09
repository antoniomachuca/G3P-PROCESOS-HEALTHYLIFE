import { useEffect, useState } from "react";
import { ApiError, cargarEventos, reservarPlaza } from "./api";
import type { Deporte, EstadoReserva, Evento } from "./tipos";
import { FormularioEvento } from "./FormularioEvento";

const USUARIO_DEMO = import.meta.env.VITE_DEMO_USER_ID ?? "usr_mock_010";
const NOMBRE_DEPORTE: Record<Deporte, string> = {
  futbol: "Fútbol",
  running: "Running",
  padel: "Pádel",
  natacion: "Natación",
  yoga: "Yoga",
  ciclismo: "Ciclismo",
};
const IMAGEN_DEMO: Partial<Record<Deporte, string>> = {
  padel: "/img/eventos/padel-demo.jpg",
  running: "/img/eventos/running-demo.jpg",
};
const DEPORTES: Array<Deporte | "todos"> = ["todos", "padel", "running", "futbol", "natacion", "yoga", "ciclismo"];

type Aviso = { tipo: "exito" | "error"; texto: string };

function fechaCompleta(valor: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(valor));
}

function hora(valor: string): string {
  return new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(new Date(valor));
}

function App() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [consulta, setConsulta] = useState("");
  const [deporteActivo, setDeporteActivo] = useState<Deporte | "todos">("todos");
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [creandoEvento, setCreandoEvento] = useState(false);
  const [reservandoId, setReservandoId] = useState("");
  const [reservas, setReservas] = useState<Record<string, EstadoReserva>>({});
  const [aviso, setAviso] = useState<Aviso | null>(null);

  async function actualizarCatalogo() {
    setCargando(true);
    setErrorCarga("");
    try {
      const lista = await cargarEventos();
      setEventos(lista);
      setEventoSeleccionado((actual) => (actual ? lista.find((evento) => evento.id === actual.id) ?? null : null));
    } catch {
      setErrorCarga("No se pudo conectar con el servicio de actividades. Comprueba que la API esté iniciada.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void actualizarCatalogo();
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const temporizador = window.setTimeout(() => setAviso(null), 5000);
    return () => window.clearTimeout(temporizador);
  }, [aviso]);

  async function gestionarReserva(evento: Evento) {
    if (reservandoId || evento.plazasDisponibles <= 0 || reservas[evento.id]) return;
    setReservandoId(evento.id);
    setAviso(null);

    try {
      const resultado = await reservarPlaza(evento.id, USUARIO_DEMO);
      setEventos((actuales) =>
        actuales.map((actual) =>
          actual.id === evento.id ? { ...actual, plazasDisponibles: resultado.plazasDisponibles } : actual,
        ),
      );
      setEventoSeleccionado((actual) =>
        actual?.id === evento.id ? { ...actual, plazasDisponibles: resultado.plazasDisponibles } : actual,
      );
      setReservas((actuales) => ({ ...actuales, [evento.id]: resultado.estado }));
      setAviso({
        tipo: "exito",
        texto:
          resultado.estado === "confirmada"
            ? `Plaza confirmada para «${evento.titulo}».`
            : `Aforo completo: estás en la lista de espera de «${evento.titulo}».`,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setAviso({ tipo: "error", texto: "El aforo ha cambiado. Hemos actualizado las plazas disponibles." });
        await actualizarCatalogo();
      } else {
        setAviso({
          tipo: "error",
          texto: error instanceof ApiError ? error.message : "No se ha podido contactar con el servicio de reservas.",
        });
      }
    } finally {
      setReservandoId("");
    }
  }

  const eventosFiltrados = eventos.filter((evento) => {
    const texto = `${evento.titulo} ${evento.lugar.nombre} ${evento.lugar.municipio} ${evento.deporte}`.toLowerCase();
    return texto.includes(consulta.toLowerCase().trim()) && (deporteActivo === "todos" || evento.deporte === deporteActivo);
  });
  const plazasTotales = eventos.reduce((suma, evento) => suma + evento.plazasDisponibles, 0);

  return (
    <div className="app-shell">
      <header className="barra-superior">
        <a className="marca" href="#catalogo" onClick={() => setEventoSeleccionado(null)} aria-label="URJC Healthy Life, catálogo">
          <span className="marca__siglas">URJC</span>
          <span className="marca__separador" />
          <span className="marca__nombre">Healthy Life</span>
        </a>
        <nav className="navegacion" aria-label="Navegación principal">
          <a className={!eventoSeleccionado && !creandoEvento ? "navegacion__activo" : ""} href="#catalogo" onClick={() => { setEventoSeleccionado(null); setCreandoEvento(false); }}>
            Actividades
          </a>
          <button className="boton boton--primario" style={{ minHeight: '34px', padding: '6px 12px', fontSize: '13px' }} onClick={() => { setEventoSeleccionado(null); setCreandoEvento(true); }}>
            Publicar actividad
          </button>
        </nav>
        <span className="entorno-demo">Entorno de demostración</span>
      </header>

      {creandoEvento ? (
        <FormularioEvento 
          onCreado={(nuevoEvento) => {
            setEventos(prev => [...prev, nuevoEvento].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()));
            setCreandoEvento(false);
            setAviso({ tipo: "exito", texto: "¡Actividad publicada correctamente!" });
          }} 
          onCancelar={() => setCreandoEvento(false)} 
        />
      ) : eventoSeleccionado ? (
        <main className="contenido contenido--ficha">
          <button className="enlace-volver" type="button" onClick={() => setEventoSeleccionado(null)}>
            Volver al catálogo
          </button>
          <div className="ficha-cabecera">
            <div className="ficha-foto-wrap">
              <img className="ficha-foto" src={IMAGEN_DEMO[eventoSeleccionado.deporte] ?? `/img/eventos/${eventoSeleccionado.deporte}.jpg`} alt={`Actividad de ${NOMBRE_DEPORTE[eventoSeleccionado.deporte]}`} />
              <span className="etiqueta-foto">{NOMBRE_DEPORTE[eventoSeleccionado.deporte]}</span>
            </div>
            <div className="ficha-titulo">
              <p className="ceja">Ficha de actividad</p>
              <h1>{eventoSeleccionado.titulo}</h1>
              <p>{eventoSeleccionado.descripcion}</p>
              <span className="nivel">Nivel {eventoSeleccionado.nivel}</span>
            </div>
          </div>
          <div className="ficha-cuerpo">
            <section className="datos-evento" aria-label="Información de la actividad">
              <div className="dato-evento">
                <span className="dato-evento__etiqueta">Fecha y hora</span>
                <strong>{fechaCompleta(eventoSeleccionado.inicio)}</strong>
                <span>{hora(eventoSeleccionado.inicio)} - {hora(eventoSeleccionado.fin)}</span>
              </div>
              <div className="dato-evento">
                <span className="dato-evento__etiqueta">Instalación</span>
                <strong>{eventoSeleccionado.lugar.nombre}</strong>
                <span>{eventoSeleccionado.lugar.municipio}</span>
              </div>
              <div className="dato-evento">
                <span className="dato-evento__etiqueta">Punto de encuentro</span>
                <strong>{eventoSeleccionado.lugar.puntoEncuentro}</strong>
                <span>{eventoSeleccionado.lugar.direccion}</span>
              </div>
              <div className="dato-evento">
                <span className="dato-evento__etiqueta">Material</span>
                <strong>{eventoSeleccionado.material.length ? eventoSeleccionado.material.join(", ") : "No se requiere material"}</strong>
              </div>
            </section>
            <aside className="reserva-panel" aria-label="Reserva de plaza">
              <p className="ceja">Plazas disponibles</p>
              <div className="contador-grande">
                <strong>{eventoSeleccionado.plazasDisponibles}</strong>
                <span>de {eventoSeleccionado.aforoMaximo}</span>
              </div>
              <div className="barra-aforo" role="img" aria-label={`${eventoSeleccionado.aforoMaximo - eventoSeleccionado.plazasDisponibles} de ${eventoSeleccionado.aforoMaximo} plazas ocupadas`}>
                <span style={{ width: `${Math.min(100, ((eventoSeleccionado.aforoMaximo - eventoSeleccionado.plazasDisponibles) / eventoSeleccionado.aforoMaximo) * 100)}%` }} />
              </div>
              <BotonReserva
                evento={eventoSeleccionado}
                reservando={reservandoId === eventoSeleccionado.id}
                estadoReserva={reservas[eventoSeleccionado.id]}
                onReservar={() => void gestionarReserva(eventoSeleccionado)}
              />
              <p className="nota-reserva">La confirmación se realiza en el momento.</p>
            </aside>
          </div>
        </main>
      ) : (
        <main id="catalogo" className="contenido">
          <section className="presentacion">
            <div>
              <p className="ceja">Deporte universitario · URJC</p>
              <h1>Actividades deportivas</h1>
              <p className="presentacion__bajada">Consulta las próximas sesiones y reserva tu plaza.</p>
            </div>
            <div className="resumen-catalogo" aria-label="Resumen de actividades">
              <div><strong>{eventos.length}</strong><span>actividades abiertas</span></div>
              <div><strong>{plazasTotales}</strong><span>plazas disponibles</span></div>
            </div>
          </section>

          <section className="controles" aria-label="Buscar actividades">
            <label className="busqueda">
              <span className="sr-only">Buscar actividad, instalación o campus</span>
              <input value={consulta} onChange={(evento) => setConsulta(evento.target.value)} placeholder="Buscar actividad, instalación o campus" />
            </label>
            <div className="filtros-deporte" aria-label="Filtrar por deporte">
              {DEPORTES.map((deporte) => (
                <button
                  key={deporte}
                  className={deporteActivo === deporte ? "filtro filtro--activo" : "filtro"}
                  type="button"
                  aria-pressed={deporteActivo === deporte}
                  onClick={() => setDeporteActivo(deporte)}
                >
                  {deporte === "todos" ? "Todos" : NOMBRE_DEPORTE[deporte]}
                </button>
              ))}
            </div>
          </section>

          <section className="seccion-catalogo" aria-labelledby="titulo-catalogo">
            <div className="seccion-cabecera">
              <div><p className="ceja">Próximas convocatorias</p><h2 id="titulo-catalogo">Encuentra tu actividad</h2></div>
              {!cargando && <span className="contador-resultados">{eventosFiltrados.length} resultados</span>}
            </div>

            {cargando ? (
              <div className="estado-pagina" role="status">Cargando actividades...</div>
            ) : errorCarga ? (
              <div className="estado-pagina estado-pagina--error" role="alert">
                <p>{errorCarga}</p>
                <button className="boton boton--secundario" type="button" onClick={() => void actualizarCatalogo()}>Reintentar</button>
              </div>
            ) : eventosFiltrados.length ? (
              <div className="rejilla-eventos">
                {eventosFiltrados.map((evento) => (
                  <TarjetaEvento
                    key={evento.id}
                    evento={evento}
                    reservando={reservandoId === evento.id}
                    estadoReserva={reservas[evento.id]}
                    onAbrir={() => setEventoSeleccionado(evento)}
                    onReservar={() => void gestionarReserva(evento)}
                  />
                ))}
              </div>
            ) : (
              <div className="estado-pagina">No hay actividades que coincidan con la búsqueda.</div>
            )}
          </section>
          <footer className="pie">Universidad Rey Juan Carlos · Healthy Life</footer>
        </main>
      )}

      {aviso && (
        <div className={`aviso aviso--${aviso.tipo}`} role={aviso.tipo === "error" ? "alert" : "status"} aria-live="polite">
          <span>{aviso.texto}</span>
          <button type="button" aria-label="Cerrar aviso" onClick={() => setAviso(null)}>×</button>
        </div>
      )}
    </div>
  );
}

function BotonReserva({
  evento,
  reservando,
  estadoReserva,
  onReservar,
}: {
  evento: Evento;
  reservando: boolean;
  estadoReserva?: EstadoReserva;
  onReservar: () => void;
}) {
  const sinPlazas = evento.plazasDisponibles <= 0;
  const inscrito = Boolean(estadoReserva);
  const texto = reservando
    ? "Reservando..."
    : estadoReserva === "confirmada"
      ? "Plaza confirmada"
      : estadoReserva === "en_espera"
        ? "En lista de espera"
        : sinPlazas
          ? "Sin plazas"
          : "Reservar plaza";

  return (
    <button className="boton boton--primario boton--reserva" type="button" onClick={onReservar} disabled={reservando || sinPlazas || inscrito}>
      {texto}
    </button>
  );
}

function TarjetaEvento({
  evento,
  reservando,
  estadoReserva,
  onAbrir,
  onReservar,
}: {
  evento: Evento;
  reservando: boolean;
  estadoReserva?: EstadoReserva;
  onAbrir: () => void;
  onReservar: () => void;
}) {
  const porcentajeOcupacion = Math.min(100, Math.max(0, ((evento.aforoMaximo - evento.plazasDisponibles) / evento.aforoMaximo) * 100));

  return (
    <article className="tarjeta-evento">
      <button className="tarjeta-evento__foto" type="button" onClick={onAbrir} aria-label={`Ver ficha de ${evento.titulo}`}>
        <img src={IMAGEN_DEMO[evento.deporte] ?? `/img/eventos/${evento.deporte}.jpg`} alt={`Actividad de ${NOMBRE_DEPORTE[evento.deporte]}`} loading="lazy" />
        <span className="etiqueta-foto">{NOMBRE_DEPORTE[evento.deporte]}</span>
      </button>
      <div className="tarjeta-evento__contenido">
        <div className="tarjeta-evento__lugar">{evento.lugar.municipio} <span>·</span> {evento.nivel}</div>
        <h3>{evento.titulo}</h3>
        <div className="detalle-breve">
          <span>{fechaCompleta(evento.inicio)} · {hora(evento.inicio)}</span>
          <span>{evento.lugar.nombre}</span>
        </div>
        <div className="ocupacion">
          <div className="ocupacion__texto"><span>Plazas disponibles</span><strong>{evento.plazasDisponibles} de {evento.aforoMaximo}</strong></div>
          <div className="barra-aforo" role="img" aria-label={`${evento.aforoMaximo - evento.plazasDisponibles} de ${evento.aforoMaximo} plazas ocupadas`}>
            <span style={{ width: `${porcentajeOcupacion}%` }} />
          </div>
        </div>
      </div>
      <div className="tarjeta-evento__acciones">
        <button className="boton boton--secundario" type="button" onClick={onAbrir}>Ver ficha</button>
        <BotonReserva evento={evento} reservando={reservando} estadoReserva={estadoReserva} onReservar={onReservar} />
      </div>
    </article>
  );
}

export default App;