-- HU-11 / G3P-97: aforo mínimo y fecha límite de inscripción previa en eventos.
ALTER TABLE eventos ADD COLUMN aforo_minimo INTEGER
  CHECK (aforo_minimo IS NULL OR (aforo_minimo >= 1 AND aforo_minimo <= capacidad));

ALTER TABLE eventos ADD COLUMN fecha_limite_inscripcion TEXT
  CHECK (fecha_limite_inscripcion IS NULL OR length(trim(fecha_limite_inscripcion)) > 0);
