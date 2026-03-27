#!/usr/bin/env python3
"""
Script para migrar datos de infobras.db (SQLite) → Supabase (PostgreSQL)
Ejecutar una sola vez para carga inicial de datos.

Uso:
  pip install supabase python-dotenv
  python supabase/seed_from_sqlite.py

Variables de entorno requeridas en .env.local:
  NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY
"""

import sqlite3
import os
import json
from datetime import datetime

# Carga .env.local manualmente
def load_env(path='.env.local'):
    if not os.path.exists(path):
        print(f"⚠️  Archivo {path} no encontrado")
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

load_env()

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
SERVICE_KEY  = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SERVICE_KEY:
    raise SystemExit("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local")

from supabase import create_client
sb = create_client(SUPABASE_URL, SERVICE_KEY)

# ── Ruta a la BD SQLite del scraper ──────────────────────────────────────────
# Ajusta esta ruta según donde tengas tu infobras.db
SQLITE_PATH = '../data/infobras.db'  # relativo al directorio del proyecto

if not os.path.exists(SQLITE_PATH):
    # Intenta ruta alternativa
    SQLITE_PATH = 'infobras-scraper/data/infobras.db'

conn = sqlite3.connect(SQLITE_PATH)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

# ── 1. Migrar tabla obras ─────────────────────────────────────────────────────
print("📦 Migrando obras...")
cur.execute("""
    SELECT
        obra_id,
        nombre_obra,
        municipio,
        entidad,
        estado,
        monto_aprobado,
        avance_fisico,
        fecha_inicio,
        fecha_fin
    FROM obras
""")

rows = cur.fetchall()
BATCH = 500
total = 0

for i in range(0, len(rows), BATCH):
    batch = rows[i:i+BATCH]
    data = []
    for r in batch:
        row = dict(r)
        # Limpia fechas vacías
        for f in ('fecha_inicio', 'fecha_fin'):
            if not row.get(f):
                row[f] = None
        data.append(row)

    result = sb.table('obras').upsert(data, on_conflict='obra_id').execute()
    total += len(batch)
    print(f"  ✓ {total}/{len(rows)} obras migradas")

print(f"✅ Obras migradas: {total}")

# ── 2. Migrar event_log ───────────────────────────────────────────────────────
print("\n📦 Migrando event log...")
try:
    cur.execute("""
        SELECT
            case_id,
            activity,
            timestamp,
            resource,
            case_estado,
            case_monto,
            porcentaje
        FROM event_log
        ORDER BY timestamp
    """)
    events = cur.fetchall()
    total_ev = 0

    for i in range(0, len(events), BATCH):
        batch = events[i:i+BATCH]
        data = [dict(e) for e in batch]
        sb.table('event_log').upsert(data).execute()
        total_ev += len(batch)
        print(f"  ✓ {total_ev}/{len(events)} eventos migrados")

    print(f"✅ Eventos migrados: {total_ev}")
except Exception as e:
    print(f"⚠️  No se pudo migrar event_log: {e}")

conn.close()
print("\n🎉 Migración completada. Verifica los datos en Supabase → Table Editor")
