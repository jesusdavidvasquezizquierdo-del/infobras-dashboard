"""
extraer_cuellos_botella.py — Extrae datos de análisis de cuellos de botella
desde los DataSets Excel de InfoBras.

Genera:
  1. obras_detalle_lambayeque_FECHA.csv  — datos completos por obra
  2. event_log_excel_FECHA.csv           — event log para PM4Py
  3. Sube obras_detalle a Supabase

Uso:
  python extraer_cuellos_botella.py
"""

import os
import sys
import csv
from datetime import datetime, date
from typing import Optional, Dict, List

try:
    import pandas as pd
except ImportError:
    print("Instala pandas: pip install pandas openpyxl --break-system-packages")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Instala requests: pip install requests --break-system-packages")
    sys.exit(1)

# ── Configuración ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR  = BASE_DIR

ARCHIVOS_EXCEL = [
    os.path.join(BASE_DIR, "DataSet-Obras-Paralizadas 12-03-2025 (1).xlsx"),
    os.path.join(BASE_DIR, "DataSet-Obras-Publicas 27-03-2026.xlsx"),
    os.path.join(BASE_DIR, "DataSet-Obras-en-reconstruccion-con-Cambios 27-03-2026.xlsx"),
]

DEPARTAMENTO_FILTRO = "LAMBAYEQUE"

# Columnas que nos interesan: nombre_interno → posibles nombres en el Excel
MAPA_COLS = {
    'obra_id':              ['Código INFOBRAS', 'CODIGO INFOBRAS', 'Código Infobras'],
    'cui':                  ['Código único de inversión', 'Código Único de Inversión', 'CUI'],
    'snip':                 ['Código SNIP', 'CÓDIGO SNIP'],
    'entidad':              ['Entidad Pública', 'ENTIDAD PÚBLICA'],
    'nombre_obra':          ['Nombre de obra', 'NOMBRE DE OBRA', 'Nombre de la Obra'],
    'departamento':         ['Departamento', 'DEPARTAMENTO', 'Región'],
    'provincia':            ['Provincia', 'PROVINCIA'],
    'distrito':             ['Distrito', 'DISTRITO'],
    'modalidad':            ['Modalidad de ejecución de la obra', 'Modalidad de ejecuci'],
    'contratista':          ['Contratista', 'CONTRATISTA'],
    'ruc_contratista':      ['RUC - Contratista', 'RUC Contratista'],
    'supervisor':           ['Nombres Apellidos Supervisor / Inspector', 'Supervisor / Inspector'],
    'empresa_supervision':  ['Empresa o consorcio de Supervisión:', 'Empresa Supervisión'],
    'fecha_inicio':         ['Fecha de inicio de obra', 'Fecha Inicio de Obra'],
    'fecha_fin_programada': ['Fecha finalización programada de obra', 'Fecha Finalización Programada'],
    'plazo_dias':           ['Plazo de ejecución (en días)', 'Plazo de Ejecución (en días)'],
    'fecha_entrega_terreno':['Fecha de entrega del terreno', 'Fecha Entrega Terreno'],
    'fecha_fin_reprogramada':['Fecha finalización reprogramada de obra', 'Fecha Fin Reprogramada'],
    'fecha_fin_real':       ['Fecha de finalización real', 'Fecha Finalización Real'],
    'fecha_recepcion':      ['Fecha de recepción', 'Fecha de Recepción'],
    'fecha_liquidacion':    ['Fecha de aprobación de liquidación de obra', 'Fecha Liquidación'],
    'monto_aprobado_soles': ['Monto aprobado en soles', 'Monto Aprobado en Soles'],
    'monto_contrato':       ['Monto del contrato en soles', 'Monto del Contrato en Soles'],
    'avance_programado':    ['Avance Físico Programado Acumulado (%)', 'Avance Físico Programado Acumulado (%)'],
    'avance_real':          ['Avance Físico Real Acumulado (%)', 'Avance Físico Real Acumulado (%)'],
    'causal_paralizacion':  ['Causal de paralización', 'Causal de Paralización'],
    'fecha_paralizacion':   ['Fecha de paralización', 'Fecha de Paralización'],
    'dias_paralizados':     ['Número de días paralizados', 'N° días paralizados'],
    'n_modif_plazo':        ['N° de modificaciones de plazo', 'N° Modificaciones de Plazo'],
    'dias_modif_plazo':     ['N° días de modificaciones de plazo', 'N° días Modificaciones de Plazo'],
    'nuevo_plazo_dias':     ['Nuevo Plazo de ejecución (en días)', 'Nuevo Plazo de Ejecución (en días)'],
    'n_adicionales':        ['N° de adicionales de obra', 'N° Adicionales de Obra'],
    'monto_adicionales':    ['Monto de adicionales de obra en soles', 'Monto de Adicionales de Obra en Soles'],
    'n_deductivos':         ['N° de deductivos de obra', 'N° Deductivos de Obra'],
    'monto_deductivos':     ['Monto de deductivos de obra en soles', 'Monto de Deductivos de Obra en Soles'],
    'n_controversias':      ['N° de controversias', 'N° Controversias'],
    'n_informes_control':   ['N° Informes de control', 'N° Informes de Control'],
    'n_denuncias':          ['N° Denuncias vinculadas', 'N° Denuncias Vinculadas'],
}


# ── Utilidades ─────────────────────────────────────────────────────────────────
def encontrar_header_fila(df_raw: pd.DataFrame) -> Optional[int]:
    """Encuentra la fila que tiene ≥5 valores no nulos (es la de encabezados)."""
    for i, row in df_raw.iterrows():
        no_nulos = row.notna().sum()
        if no_nulos >= 5:
            return i
    return None


def mapear_columnas(cols: list) -> Dict[str, str]:
    """Devuelve {clave_interna: nombre_columna_en_df}."""
    cols_norm = {str(c).strip().lower(): str(c) for c in cols}
    result = {}
    for clave, nombres in MAPA_COLS.items():
        for nombre in nombres:
            nombre_norm = nombre.strip().lower()
            # búsqueda parcial
            for col_lower, col_orig in cols_norm.items():
                if nombre_norm in col_lower or col_lower in nombre_norm:
                    result[clave] = col_orig
                    break
            if clave in result:
                break
    return result


def parse_fecha(v) -> Optional[str]:
    if pd.isna(v) if hasattr(pd, 'isna') else v is None:
        return None
    if isinstance(v, (datetime, date, pd.Timestamp)):
        return pd.Timestamp(v).strftime('%Y-%m-%d')
    s = str(v).strip()
    if not s or s.lower() in ('n/a', 'none', '-', '', 'nat'):
        return None
    import re
    m = re.search(r'(\d{1,2})/(\d{1,2})/(\d{2,4})', s)
    if m:
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if y < 100: y += 2000
        try:
            return f"{y:04d}-{mo:02d}-{d:02d}"
        except Exception:
            return None
    m = re.match(r'(\d{4})-(\d{2})-(\d{2})', s)
    if m:
        return s[:10]
    return None


def parse_num(v) -> Optional[float]:
    if v is None or (hasattr(v, '__class__') and v.__class__.__name__ == 'float' and str(v) == 'nan'):
        return None
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass
    try:
        return float(str(v).replace(',', '').strip())
    except Exception:
        return None


def parse_int(v) -> Optional[int]:
    n = parse_num(v)
    return int(n) if n is not None else None


def get_val(row, col_map, clave):
    col = col_map.get(clave)
    if col is None or col not in row.index:
        return None
    v = row[col]
    try:
        if pd.isna(v):
            return None
    except Exception:
        pass
    return v


# ── Extracción principal ───────────────────────────────────────────────────────
def extraer_excel(path: str) -> List[Dict]:
    """Lee un Excel de InfoBras con pandas y extrae filas de Lambayeque."""
    print(f"\nLeyendo: {os.path.basename(path)}")
    if not os.path.exists(path):
        print(f"  ⚠ No existe: {path}")
        return []

    # Leer sin headers (los detectamos dinámicamente)
    print("  Cargando archivo (puede tardar para archivos grandes)...")
    df_raw = pd.read_excel(path, header=None, dtype=str, engine='openpyxl')
    print(f"  Dimensiones: {df_raw.shape[0]} filas × {df_raw.shape[1]} columnas")

    # Encontrar fila de headers
    header_idx = encontrar_header_fila(df_raw)
    if header_idx is None:
        print("  ⚠ No se encontró fila de headers")
        return []

    # Reconstruir con headers correctos
    headers   = df_raw.iloc[header_idx].tolist()
    df        = df_raw.iloc[header_idx + 1:].copy()
    df.columns = headers
    df = df.reset_index(drop=True)

    col_map = mapear_columnas(headers)
    print(f"  Headers en fila {header_idx + 1}")
    print(f"  Columnas mapeadas: {len(col_map)}/{len(MAPA_COLS)}")
    print(f"  Filas de datos: {len(df)}")

    # Filtrar por departamento
    dept_col = col_map.get('departamento')
    if dept_col and dept_col in df.columns:
        mask = df[dept_col].str.upper().str.contains(DEPARTAMENTO_FILTRO, na=False)
        df_lamb = df[mask].copy()
    else:
        print("  ⚠ No se encontró columna 'departamento' — usando todas las filas")
        df_lamb = df.copy()

    print(f"  ✅ {len(df_lamb)} obras de Lambayeque extraídas")

    registros = []
    for _, row in df_lamb.iterrows():
        obra_id = get_val(row, col_map, 'obra_id')
        if not obra_id or str(obra_id).strip() in ('', 'None', 'nan'):
            continue

        rec = {
            'obra_id':              str(obra_id).strip(),
            'cui':                  str(get_val(row, col_map, 'cui') or '').strip() or None,
            'snip':                 str(get_val(row, col_map, 'snip') or '').strip() or None,
            'entidad':              str(get_val(row, col_map, 'entidad') or '').strip() or None,
            'nombre_obra':          str(get_val(row, col_map, 'nombre_obra') or '').strip() or None,
            'departamento':         str(get_val(row, col_map, 'departamento') or '').strip() or None,
            'provincia':            str(get_val(row, col_map, 'provincia') or '').strip() or None,
            'distrito':             str(get_val(row, col_map, 'distrito') or '').strip() or None,
            'modalidad':            str(get_val(row, col_map, 'modalidad') or '').strip() or None,
            'contratista':          str(get_val(row, col_map, 'contratista') or '').strip() or None,
            'ruc_contratista':      str(get_val(row, col_map, 'ruc_contratista') or '').strip() or None,
            'supervisor':           str(get_val(row, col_map, 'supervisor') or '').strip() or None,
            'fecha_inicio':         parse_fecha(get_val(row, col_map, 'fecha_inicio')),
            'fecha_fin_programada': parse_fecha(get_val(row, col_map, 'fecha_fin_programada')),
            'fecha_fin_reprogramada':parse_fecha(get_val(row, col_map, 'fecha_fin_reprogramada')),
            'fecha_fin_real':       parse_fecha(get_val(row, col_map, 'fecha_fin_real')),
            'fecha_entrega_terreno':parse_fecha(get_val(row, col_map, 'fecha_entrega_terreno')),
            'fecha_recepcion':      parse_fecha(get_val(row, col_map, 'fecha_recepcion')),
            'fecha_liquidacion':    parse_fecha(get_val(row, col_map, 'fecha_liquidacion')),
            'plazo_dias':           parse_int(get_val(row, col_map, 'plazo_dias')),
            'nuevo_plazo_dias':     parse_int(get_val(row, col_map, 'nuevo_plazo_dias')),
            'monto_aprobado_soles': parse_num(get_val(row, col_map, 'monto_aprobado_soles')),
            'monto_contrato':       parse_num(get_val(row, col_map, 'monto_contrato')),
            'avance_programado':    parse_num(get_val(row, col_map, 'avance_programado')),
            'avance_real':          parse_num(get_val(row, col_map, 'avance_real')),
            'causal_paralizacion':  str(get_val(row, col_map, 'causal_paralizacion') or '').strip() or None,
            'fecha_paralizacion':   parse_fecha(get_val(row, col_map, 'fecha_paralizacion')),
            'dias_paralizados':     parse_int(get_val(row, col_map, 'dias_paralizados')),
            'n_modif_plazo':        parse_int(get_val(row, col_map, 'n_modif_plazo')) or 0,
            'dias_modif_plazo':     parse_int(get_val(row, col_map, 'dias_modif_plazo')) or 0,
            'n_adicionales':        parse_int(get_val(row, col_map, 'n_adicionales')) or 0,
            'monto_adicionales':    parse_num(get_val(row, col_map, 'monto_adicionales')) or 0,
            'n_deductivos':         parse_int(get_val(row, col_map, 'n_deductivos')) or 0,
            'monto_deductivos':     parse_num(get_val(row, col_map, 'monto_deductivos')) or 0,
            'n_controversias':      parse_int(get_val(row, col_map, 'n_controversias')) or 0,
            'n_informes_control':   parse_int(get_val(row, col_map, 'n_informes_control')) or 0,
            'n_denuncias':          parse_int(get_val(row, col_map, 'n_denuncias')) or 0,
            'fuente_archivo':       os.path.basename(path)[:80],
        }

        # Métricas derivadas
        if rec['fecha_inicio'] and rec['fecha_fin_real']:
            try:
                fi = datetime.strptime(rec['fecha_inicio'], '%Y-%m-%d')
                fr = datetime.strptime(rec['fecha_fin_real'], '%Y-%m-%d')
                rec['duracion_real_dias'] = (fr - fi).days
            except ValueError:
                rec['duracion_real_dias'] = None
        else:
            rec['duracion_real_dias'] = None

        if rec['fecha_inicio'] and rec['fecha_fin_programada']:
            try:
                fi = datetime.strptime(rec['fecha_inicio'], '%Y-%m-%d')
                fp = datetime.strptime(rec['fecha_fin_programada'], '%Y-%m-%d')
                rec['duracion_programada_dias'] = (fp - fi).days
            except ValueError:
                rec['duracion_programada_dias'] = rec.get('plazo_dias')
        else:
            rec['duracion_programada_dias'] = rec.get('plazo_dias')

        if rec.get('duracion_real_dias') is not None and rec.get('duracion_programada_dias'):
            rec['retraso_dias'] = rec['duracion_real_dias'] - rec['duracion_programada_dias']
        else:
            rec['retraso_dias'] = None

        registros.append(rec)

    return registros


def generar_event_log(registros: List[Dict]) -> List[Dict]:
    eventos = []
    fechas_actividades = [
        ('fecha_entrega_terreno',   'A02_ENTREGA_TERRENO',   'Entrega de terreno'),
        ('fecha_inicio',            'A06_INICIO_OBRA',        'Inicio de obra'),
        ('fecha_fin_programada',    'A09_FIN_PROGRAMADO',     'Fin programado de obra'),
        ('fecha_paralizacion',      'A15_PARALIZACION',       'Paralización de obra'),
        ('fecha_fin_reprogramada',  'A09_FIN_REPROGRAMADO',   'Fin reprogramado de obra'),
        ('fecha_fin_real',          'A09_FIN_REAL',           'Fin real de obra'),
        ('fecha_recepcion',         'A10_RECEPCION',          'Recepción de obra'),
        ('fecha_liquidacion',       'A18_LIQUIDACION',        'Liquidación de obra'),
    ]
    for r in registros:
        for campo, cod, nombre in fechas_actividades:
            fecha = r.get(campo)
            if fecha:
                eventos.append({
                    'case_id':        r['obra_id'],
                    'activity':       cod,
                    'time:timestamp': fecha,
                    'resource':       'INFOBRAS_EXCEL',
                    'tipo_actividad': nombre,
                    'descripcion':    r.get('causal_paralizacion') if cod == 'A15_PARALIZACION' else nombre,
                    'case_nombre':    r.get('nombre_obra', ''),
                    'case_entidad':   r.get('entidad', ''),
                    'case_provincia': r.get('provincia', ''),
                    'case_monto':     r.get('monto_aprobado_soles', ''),
                })
    return eventos


def subir_supabase(registros: List[Dict], tabla: str):
    # Leer credenciales
    env_paths = [
        os.path.join(BASE_DIR, '..', '.env.local'),
        os.path.join(BASE_DIR, '.env.local'),
    ]
    for ep in env_paths:
        if os.path.exists(ep):
            with open(ep, encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        k, v = line.split('=', 1)
                        os.environ.setdefault(k.strip(), v.strip())
            break

    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
    key = (os.environ.get('SUPABASE_SERVICE_ROLE_KEY') or
           os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''))

    if not url or not key:
        print("  ⚠ Sin credenciales Supabase — solo CSV generado")
        return 0

    BATCH = 300
    total_ok = 0
    hdrs = {
        'apikey': key,
        'Authorization': f'Bearer {key}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
    }
    endpoint = f"{url}/rest/v1/{tabla}"

    for i in range(0, len(registros), BATCH):
        batch = registros[i:i+BATCH]
        limpios = []
        for rec in batch:
            limpio = {}
            for k, v in rec.items():
                if isinstance(v, (datetime, date)):
                    limpio[k] = v.isoformat()
                elif v is None or str(v) in ('None', 'nan', ''):
                    limpio[k] = None
                else:
                    limpio[k] = v
            limpios.append(limpio)

        r = requests.post(endpoint, headers=hdrs, json=limpios, timeout=30)
        if r.status_code in (200, 201):
            total_ok += len(limpios)
            print(f"  ✅ Lote {i//BATCH+1}: {len(limpios)} registros → OK")
        else:
            print(f"  ❌ Lote {i//BATCH+1}: HTTP {r.status_code} — {r.text[:200]}")

    return total_ok


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    print("=" * 60)
    print("📊 Extractor de Cuellos de Botella — InfoBras Lambayeque")
    print("=" * 60)

    todos = []
    for archivo in ARCHIVOS_EXCEL:
        registros = extraer_excel(archivo)
        todos.extend(registros)

    # Deduplicar por obra_id (la más completa)
    por_id = {}
    for r in todos:
        oid = r['obra_id']
        if oid not in por_id:
            por_id[oid] = r
        else:
            existente = por_id[oid]
            if sum(1 for v in r.values() if v) > sum(1 for v in existente.values() if v):
                por_id[oid] = r

    registros_final = list(por_id.values())
    print(f"\n{'='*60}")
    print(f"Total obras únicas de Lambayeque: {len(registros_final)}")

    # Estadísticas
    con_causal    = sum(1 for r in registros_final if r.get('causal_paralizacion'))
    con_retraso   = sum(1 for r in registros_final if r.get('retraso_dias') and r['retraso_dias'] > 0)
    con_ampliacion= sum(1 for r in registros_final if r.get('n_modif_plazo') and r['n_modif_plazo'] > 0)
    con_adicional = sum(1 for r in registros_final if r.get('n_adicionales') and r['n_adicionales'] > 0)

    print(f"\n  Con causal de paralización:    {con_causal}")
    print(f"  Con retraso (fin real > prog):  {con_retraso}")
    print(f"  Con ampliaciones de plazo:     {con_ampliacion}")
    print(f"  Con adicionales de obra:       {con_adicional}")

    if con_retraso > 0:
        retrasos = [r['retraso_dias'] for r in registros_final
                    if r.get('retraso_dias') and r['retraso_dias'] > 0]
        print(f"\n  Retraso promedio: {sum(retrasos)/len(retrasos):.0f} días")
        print(f"  Retraso máximo:   {max(retrasos)} días ({max(retrasos)/365:.1f} años)")

    causales = {}
    for r in registros_final:
        c = r.get('causal_paralizacion')
        if c:
            causales[c] = causales.get(c, 0) + 1
    if causales:
        print("\n  Top causales de paralización:")
        for c, n in sorted(causales.items(), key=lambda x: -x[1])[:5]:
            print(f"    {n:3d}x — {c[:65]}")

    print(f"\n{'='*60}")

    # Exportar CSVs
    ts = datetime.now().strftime("%Y%m%d_%H%M")
    csv_detalle  = os.path.join(OUT_DIR, f"obras_detalle_lambayeque_{ts}.csv")
    csv_eventos  = os.path.join(OUT_DIR, f"event_log_excel_{ts}.csv")

    if registros_final:
        campos = list(registros_final[0].keys())
        with open(csv_detalle, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=campos)
            w.writeheader()
            w.writerows(registros_final)
        print(f"  CSV detalle: {os.path.basename(csv_detalle)}  ({len(registros_final)} filas)")

    event_log = generar_event_log(registros_final)
    if event_log:
        with open(csv_eventos, 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(event_log[0].keys()))
            w.writeheader()
            w.writerows(event_log)
        print(f"  CSV eventos: {os.path.basename(csv_eventos)}  ({len(event_log)} eventos)")

    # Subir a Supabase
    print("\n📤 Subiendo a Supabase → tabla obras_detalle ...")
    n = subir_supabase(registros_final, 'obras_detalle')
    print(f"  Total registros subidos: {n}")

    print(f"\n✅ COMPLETADO")
    if registros_final:
        print(f"   Detalle:   {csv_detalle}")
        print(f"   Eventos:   {csv_eventos}")


if __name__ == '__main__':
    main()
