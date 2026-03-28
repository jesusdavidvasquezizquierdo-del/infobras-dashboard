-- ============================================================
-- TABLA: obras_detalle
-- Datos enriquecidos de InfoBras DataSets para análisis de
-- cuellos de botella y minería de procesos.
-- Ejecutar en: Supabase → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS obras_detalle (
  obra_id               TEXT PRIMARY KEY REFERENCES obras(obra_id) ON DELETE CASCADE,
  cui                   TEXT,                    -- Código Único de Inversión (OSCE)
  snip                  TEXT,                    -- Código SNIP
  entidad               TEXT,
  nombre_obra           TEXT,
  departamento          TEXT,
  provincia             TEXT,
  distrito              TEXT,
  modalidad             TEXT,
  contratista           TEXT,
  ruc_contratista       TEXT,
  supervisor            TEXT,
  empresa_supervision   TEXT,

  -- Fechas del ciclo de vida
  fecha_inicio            DATE,
  fecha_fin_programada    DATE,
  fecha_fin_reprogramada  DATE,
  fecha_fin_real          DATE,
  fecha_entrega_terreno   DATE,
  fecha_recepcion         DATE,
  fecha_liquidacion       DATE,

  -- Plazos
  plazo_dias              INTEGER,               -- Plazo original en días
  nuevo_plazo_dias        INTEGER,               -- Plazo reprogramado en días
  duracion_real_dias      INTEGER,               -- Días reales (fin_real - inicio)
  duracion_programada_dias INTEGER,              -- Días programados
  retraso_dias            INTEGER,               -- Diferencia real - programado

  -- Montos
  monto_aprobado_soles    NUMERIC(18,2),
  monto_contrato          NUMERIC(18,2),
  monto_adicionales       NUMERIC(18,2) DEFAULT 0,
  monto_deductivos        NUMERIC(18,2) DEFAULT 0,

  -- Avance físico
  avance_programado       NUMERIC(5,2),
  avance_real             NUMERIC(5,2),

  -- Paralización
  causal_paralizacion     TEXT,
  fecha_paralizacion      DATE,
  dias_paralizados        INTEGER,

  -- Cuellos de botella — modificaciones de plazo
  n_modif_plazo           INTEGER DEFAULT 0,
  dias_modif_plazo        INTEGER DEFAULT 0,

  -- Adicionales y deductivos
  n_adicionales           INTEGER DEFAULT 0,
  n_deductivos            INTEGER DEFAULT 0,

  -- Alertas e irregularidades
  n_controversias         INTEGER DEFAULT 0,
  n_informes_control      INTEGER DEFAULT 0,
  n_denuncias             INTEGER DEFAULT 0,

  fuente_archivo          TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para análisis
CREATE INDEX IF NOT EXISTS idx_det_provincia    ON obras_detalle(provincia);
CREATE INDEX IF NOT EXISTS idx_det_causal       ON obras_detalle(causal_paralizacion);
CREATE INDEX IF NOT EXISTS idx_det_retraso      ON obras_detalle(retraso_dias);
CREATE INDEX IF NOT EXISTS idx_det_contratista  ON obras_detalle(contratista);
CREATE INDEX IF NOT EXISTS idx_det_n_modif      ON obras_detalle(n_modif_plazo);
CREATE INDEX IF NOT EXISTS idx_det_cui          ON obras_detalle(cui);

-- RLS
ALTER TABLE obras_detalle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública obras_detalle"
  ON obras_detalle FOR SELECT USING (true);

-- ── Vistas para análisis de cuellos de botella ─────────────────────────────

-- Top causales de paralización
CREATE OR REPLACE VIEW v_causales_paralizacion AS
SELECT
  causal_paralizacion,
  COUNT(*)                          AS total_obras,
  AVG(dias_paralizados)             AS dias_promedio,
  SUM(monto_aprobado_soles)         AS monto_total
FROM obras_detalle
WHERE causal_paralizacion IS NOT NULL
GROUP BY causal_paralizacion
ORDER BY total_obras DESC;

-- Análisis de retrasos
CREATE OR REPLACE VIEW v_analisis_retrasos AS
SELECT
  provincia,
  COUNT(*)                               AS total_obras,
  COUNT(*) FILTER (WHERE retraso_dias > 0) AS obras_con_retraso,
  ROUND(AVG(retraso_dias) FILTER (WHERE retraso_dias > 0), 0) AS retraso_promedio_dias,
  MAX(retraso_dias)                      AS retraso_maximo_dias,
  SUM(monto_adicionales)                 AS monto_adicionales_total,
  ROUND(AVG(n_modif_plazo), 1)           AS ampliaciones_promedio
FROM obras_detalle
WHERE fecha_inicio IS NOT NULL
GROUP BY provincia
ORDER BY retraso_promedio_dias DESC NULLS LAST;

-- Contratistas con más problemas
CREATE OR REPLACE VIEW v_contratistas_problematicos AS
SELECT
  contratista,
  ruc_contratista,
  COUNT(*)                                    AS total_obras,
  COUNT(*) FILTER (WHERE retraso_dias > 180)  AS obras_gran_retraso,
  COUNT(*) FILTER (WHERE n_modif_plazo > 2)   AS obras_mult_ampliaciones,
  COUNT(*) FILTER (WHERE n_controversias > 0) AS obras_con_controversia,
  SUM(monto_adicionales)                      AS monto_adicionales_total,
  ROUND(AVG(retraso_dias), 0)                 AS retraso_promedio_dias
FROM obras_detalle
WHERE contratista IS NOT NULL
GROUP BY contratista, ruc_contratista
HAVING COUNT(*) >= 2
ORDER BY obras_gran_retraso DESC, monto_adicionales_total DESC;
