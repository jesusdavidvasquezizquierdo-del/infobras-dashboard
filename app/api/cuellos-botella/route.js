import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function GET() {
  try {
    const supabase = getSupabase()

    // Ejecutar consultas en paralelo
    const [
      causalesRes,
      retrasosPorProvinciaRes,
      contratistasRes,
      ampliacionesRes,
      resumenRes,
    ] = await Promise.all([
      // 1. Top causales de paralización
      supabase
        .from('obras_detalle')
        .select('causal_paralizacion, dias_paralizados, monto_aprobado_soles')
        .not('causal_paralizacion', 'is', null),

      // 2. Retrasos por provincia
      supabase
        .from('obras_detalle')
        .select('provincia, retraso_dias, n_modif_plazo, monto_adicionales')
        .not('provincia', 'is', null),

      // 3. Top contratistas problemáticos
      supabase
        .from('obras_detalle')
        .select('contratista, ruc_contratista, retraso_dias, n_modif_plazo, n_controversias, monto_adicionales')
        .not('contratista', 'is', null)
        .gt('retraso_dias', 0),

      // 4. Obras con más ampliaciones de plazo
      supabase
        .from('obras_detalle')
        .select('obra_id, nombre_obra, provincia, n_modif_plazo, dias_modif_plazo, monto_adicionales, monto_aprobado_soles, contratista')
        .gt('n_modif_plazo', 0)
        .order('n_modif_plazo', { ascending: false })
        .limit(20),

      // 5. Resumen general
      supabase
        .from('obras_detalle')
        .select('obra_id, retraso_dias, dias_paralizados, n_modif_plazo, n_adicionales, monto_adicionales, causal_paralizacion'),
    ])

    // ── Procesar causales ──────────────────────────────────────────────────────
    const causalesMap = {}
    for (const r of causalesRes.data ?? []) {
      const c = r.causal_paralizacion
      if (!causalesMap[c]) {
        causalesMap[c] = { causal: c, total_obras: 0, dias_promedio: 0, monto_total: 0, _dias: [] }
      }
      causalesMap[c].total_obras++
      if (r.dias_paralizados) causalesMap[c]._dias.push(r.dias_paralizados)
      causalesMap[c].monto_total += r.monto_aprobado_soles ?? 0
    }
    const causales = Object.values(causalesMap).map(c => ({
      causal: c.causal,
      total_obras: c.total_obras,
      dias_promedio: c._dias.length ? Math.round(c._dias.reduce((a, b) => a + b, 0) / c._dias.length) : 0,
      monto_total: Math.round(c.monto_total),
    })).sort((a, b) => b.total_obras - a.total_obras)

    // ── Procesar retrasos por provincia ───────────────────────────────────────
    const provMap = {}
    for (const r of retrasosPorProvinciaRes.data ?? []) {
      const p = r.provincia
      if (!provMap[p]) {
        provMap[p] = { provincia: p, total_obras: 0, obras_con_retraso: 0, _retrasos: [], sum_adicionales: 0, sum_ampliaciones: 0 }
      }
      provMap[p].total_obras++
      if (r.retraso_dias > 0) {
        provMap[p].obras_con_retraso++
        provMap[p]._retrasos.push(r.retraso_dias)
      }
      provMap[p].sum_adicionales += r.monto_adicionales ?? 0
      provMap[p].sum_ampliaciones += r.n_modif_plazo ?? 0
    }
    const retrasosProvincia = Object.values(provMap).map(p => ({
      provincia: p.provincia,
      total_obras: p.total_obras,
      obras_con_retraso: p.obras_con_retraso,
      pct_retraso: p.total_obras ? Math.round((p.obras_con_retraso / p.total_obras) * 100) : 0,
      retraso_promedio_dias: p._retrasos.length
        ? Math.round(p._retrasos.reduce((a, b) => a + b, 0) / p._retrasos.length) : 0,
      retraso_maximo_dias: p._retrasos.length ? Math.max(...p._retrasos) : 0,
      monto_adicionales_total: Math.round(p.sum_adicionales),
      ampliaciones_promedio: p.total_obras ? (p.sum_ampliaciones / p.total_obras).toFixed(1) : 0,
    })).sort((a, b) => b.retraso_promedio_dias - a.retraso_promedio_dias)

    // ── Procesar contratistas problemáticos ───────────────────────────────────
    const contraMap = {}
    for (const r of contratistasRes.data ?? []) {
      const k = r.ruc_contratista ?? r.contratista
      if (!contraMap[k]) {
        contraMap[k] = {
          contratista: r.contratista, ruc: r.ruc_contratista,
          total_obras: 0, obras_gran_retraso: 0, obras_mult_ampliaciones: 0,
          obras_con_controversia: 0, monto_adicionales_total: 0, _retrasos: []
        }
      }
      contraMap[k].total_obras++
      if (r.retraso_dias > 180) contraMap[k].obras_gran_retraso++
      if (r.n_modif_plazo > 2) contraMap[k].obras_mult_ampliaciones++
      if (r.n_controversias > 0) contraMap[k].obras_con_controversia++
      contraMap[k].monto_adicionales_total += r.monto_adicionales ?? 0
      if (r.retraso_dias) contraMap[k]._retrasos.push(r.retraso_dias)
    }
    const contratistas = Object.values(contraMap)
      .filter(c => c.total_obras >= 1)
      .map(c => ({
        contratista: c.contratista,
        ruc: c.ruc,
        total_obras: c.total_obras,
        obras_gran_retraso: c.obras_gran_retraso,
        obras_mult_ampliaciones: c.obras_mult_ampliaciones,
        obras_con_controversia: c.obras_con_controversia,
        monto_adicionales_total: Math.round(c.monto_adicionales_total),
        retraso_promedio_dias: c._retrasos.length
          ? Math.round(c._retrasos.reduce((a, b) => a + b, 0) / c._retrasos.length) : 0,
      }))
      .sort((a, b) => b.obras_gran_retraso - a.obras_gran_retraso || b.monto_adicionales_total - a.monto_adicionales_total)
      .slice(0, 15)

    // ── Resumen KPIs ──────────────────────────────────────────────────────────
    const todos = resumenRes.data ?? []
    const conRetraso = todos.filter(r => r.retraso_dias > 0)
    const conParalizacion = todos.filter(r => r.causal_paralizacion)
    const conAmpliacion = todos.filter(r => r.n_modif_plazo > 0)
    const retrasos = conRetraso.map(r => r.retraso_dias).filter(Boolean)

    const resumen = {
      total_obras: todos.length,
      obras_con_retraso: conRetraso.length,
      obras_paralizadas: conParalizacion.length,
      obras_con_ampliacion: conAmpliacion.length,
      retraso_promedio_dias: retrasos.length
        ? Math.round(retrasos.reduce((a, b) => a + b, 0) / retrasos.length) : 0,
      retraso_maximo_dias: retrasos.length ? Math.max(...retrasos) : 0,
      monto_adicionales_total: Math.round(todos.reduce((s, r) => s + (r.monto_adicionales ?? 0), 0)),
      pct_con_retraso: todos.length ? Math.round((conRetraso.length / todos.length) * 100) : 0,
    }

    return NextResponse.json({
      resumen,
      causales: causales.slice(0, 10),
      retrasos_provincia: retrasosProvincia,
      contratistas,
      ampliaciones: ampliacionesRes.data ?? [],
    })
  } catch (err) {
    console.error('Error /api/cuellos-botella:', err)
    return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })
  }
}
