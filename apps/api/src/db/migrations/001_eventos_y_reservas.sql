CREATE TABLE eventos (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  deporte TEXT NOT NULL,
  nivel TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  inicio TEXT NOT NULL,
  fin TEXT NOT NULL,
  lugar_nombre TEXT NOT NULL,
  lugar_punto_encuentro TEXT NOT NULL,
  lugar_municipio TEXT NOT NULL,
  lugar_direccion TEXT NOT NULL,
  lugar_lat REAL NOT NULL,
  lugar_lng REAL NOT NULL,
  capacidad INTEGER NOT NULL,
  plazas_libres INTEGER NOT NULL,
  material TEXT NOT NULL,
  estado TEXT NOT NULL,
  organizador_id TEXT NOT NULL,
  community_group_id TEXT,
  routine_id TEXT,
  CONSTRAINT evento_id_prefijo CHECK (id LIKE 'evt_%' AND length(id) > 4),
  CONSTRAINT evento_deporte CHECK (deporte IN ('futbol', 'running', 'padel', 'natacion', 'yoga', 'ciclismo')),
  CONSTRAINT evento_nivel CHECK (nivel IN ('iniciacion', 'intermedio', 'competicion')),
  CONSTRAINT evento_estado CHECK (estado IN ('abierta', 'cancelada', 'finalizada')),
  CONSTRAINT evento_capacidad_no_negativa CHECK (capacidad >= 0),
  CONSTRAINT evento_plazas_libres_no_negativas CHECK (plazas_libres >= 0),
  CONSTRAINT evento_plazas_libres_dentro_de_capacidad CHECK (plazas_libres <= capacidad),
  CONSTRAINT evento_material_json CHECK (json_valid(material) AND json_type(material) = 'array')
) STRICT;

CREATE TABLE reservas (
  id TEXT PRIMARY KEY,
  evento_id TEXT NOT NULL REFERENCES eventos(id),
  usuario_id TEXT NOT NULL,
  estado TEXT NOT NULL,
  creada_en TEXT NOT NULL,
  CONSTRAINT reserva_id_prefijo CHECK (id LIKE 'ins_%' AND length(id) > 4),
  CONSTRAINT reserva_estado CHECK (estado IN ('confirmada', 'en_espera', 'cancelada', 'asistida', 'no_presentado')),
  CONSTRAINT reserva_usuario_no_vacio CHECK (length(usuario_id) > 0)
) STRICT;

CREATE INDEX idx_reservas_evento_id ON reservas (evento_id);
CREATE INDEX idx_reservas_usuario_id ON reservas (usuario_id);
