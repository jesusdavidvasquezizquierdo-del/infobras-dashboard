-- ============================================================
-- ESQUEMA InfoBras Dashboard — Supabase (PostgreSQL)
-- Ejecutar en: Supabase → SQL Editor → New Query
-- ============================================================

-- Tabla principal de obras
CREATE TABLE IF NOT EXISTS obras (
  id              BIGSERIAL PRIMARY KEY,
  obra_id         TEXT NOT NULL UNIQUE,           -- Código InfoBras
  nombre_obra     TEXT,
  municipio       TEXT,
  entidad         TEXT,
  estado          TEXT,                           -- 'En ejecucion', 'Terminada', etc.
  monto_aprobado  NUMERIC(18, 2),
  avance_fisico   NUMERIC(5, 2),                  -- % avance
  fecha_inicio    DATE,
  fecha_fin       DATE,
  anio_inicio     SMALLINT GENERATED ALWAYS AS (EXTRACT(YEAR FROM fecha_inicio)::SMALLINT) STORED,
  cod_departamento TEXT DEFAULT '14',             -- 14 = Lambayeque
  url_infobras    TEXT GENERATED ALWAYS AS (
    'https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/Sumario?ObraId=' || obra_id
  ) STORED,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de log de eventos (minería de procesos)
CREATE TABLE IF NOT EXISTS event_log (
  id            BIGSERIAL PRIMARY KEY,
  case_id       TEXT NOT NULL,                    -- = obra_id
  activity      TEXT NOT NULL,                    -- Código de actividad (A01, A08, etc.)
  activity_name TEXT,                             -- Nombre legible
  timestamp     TIMESTAMPTZ NOT NULL,
  resource      TEXT DEFAULT 'INFOBRAS',
  case_estado   TEXT,
  case_monto    NUMERIC(18, 2),
  porcentaje    NUMERIC(5, 2),                    -- Solo para A08_AVANCE_MENSUAL
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (case_id) REFERENCES obras(obra_id) ON DELETE CASCADE
);

-- ── Índices para performance ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_obras_estado       ON obras(estado);
CREATE INDEX IF NOT EXISTS idx_obras_anio         ON obras(anio_inicio);
CREATE INDEX IF NOT EXISTS idx_obras_municipio    ON obras(municipio);
CREATE INDEX IF NOT EXISTS idx_obras_monto        ON obras(monto_aprobado DESC);
CREATE INDEX IF NOT EXISTS idx_event_case_id      ON event_log(case_id);
CREATE INDEX IF NOT EXISTS idx_event_activity     ON event_log(activity);
CREATE INDEX IF NOT EXISTS idx_event_timestamp    ON event_log(timestamp);

-- ── Trigger para updated_at ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER obras_updated_at
  BEFORE UPDATE ON obras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Row Level Security (RLS) — lectura pública, escritura solo autenticada ─
ALTER TABLE obras     ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario puede leer (datos públicos de la Contraloría)
CREATE POLICY "Lectura pública de obras"
  ON obras FOR SELECT USING (true);

CREATE POLICY "Lectura pública de event_log"
  ON event_log FOR SELECT USING (true);

-- Solo service_role puede insertar/actualizar (script de carga)
-- (No se necesita policy explícita: service_role bypasea RLS por defecto)

-- ── Vista de estadísticas rápidas ────────────────────────────────────────
CREATE OR REPLACE VIEW v_stats_estado AS
SELECT
  estado,
  COUNT(*)                       AS total,
  ROUND(AVG(avance_fisico), 1)   AS avance_promedio,
  SUM(monto_aprobado)            AS monto_total
FROM obras
GROUP BY estado
ORDER BY total DESC;

CREATE OR REPLACE VIEW v_obras_por_anio AS
SELECT
  anio_inicio                    AS anio,
  COUNT(*)                       AS total,
  SUM(monto_aprobado)            AS monto_total
FROM obras
WHERE anio_inicio IS NOT NULL
GROUP BY anio_inicio
ORDER BY anio_inicio;

CREATE OR REPLACE VIEW v_top_municipios AS
SELECT
  municipio,
  COUNT(*)           AS total_obras,
  SUM(monto_aprobado) AS monto_total
FROM obras
WHERE municipio IS NOT NULL
GROUP BY municipio
ORDER BY monto_total DESC
LIMIT 20;
