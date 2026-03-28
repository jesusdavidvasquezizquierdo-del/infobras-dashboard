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

    // 1. Distribución por estado (desde view)
    const { data: estadoData } = await supabase
      .from('v_stats_estado')
      .select('estado, total, monto_total, avance_promedio')

    // 2. Obras por año (desde view)
    const { data: anioData } = await supabase
      .from('v_obras_por_anio')
      .select('anio, total, monto_total')
      .order('anio')

    // 3. Top municipios por monto
    const { data: topMunicipios } = await supabase
      .from('v_top_municipios')
      .select('municipio, total_obras, monto_total')
      .limit(15)

    // 4. Distribución por municipio — conteo de obras paralizadas
    const { data: paralizadas } = await supabase
      .from('obras')
      .select('municipio, monto_aprobado, fecha_inicio')
      .ilike('estado', '%paraliz%')

    // 5. Total general
    const { count: total } = await supabase
      .from('obras')
      .select('*', { count: 'exact', head: true })

    // 6. Calcular métricas de inversión por año
    const anioConMonto = (anioData || []).map(a => ({
      anio: a.anio,
      total: a.total,
      monto_millones: a.monto_total ? +(a.monto_total / 1e6).toFixed(1) : 0,
    }))

    // 7. Obras con avance bajo (posibles cuellos de botella)
    // En ejecución con menos del 30% de avance
    const { data: bajoPorcentaje } = await supabase
      .from('obras')
      .select('obra_id, nombre_obra, municipio, avance_fisico, monto_aprobado, fecha_inicio')
      .ilike('estado', '%ejecuci%')
      .not('avance_fisico', 'is', null)
      .lte('avance_fisico', 30)
      .order('monto_aprobado', { ascending: false })
      .limit(20)

    // 8. Estadísticas de monto por estado
    const montoTotal = (estadoData || []).reduce((s, e) => s + (e.monto_total || 0), 0)
    const montoParalizado = (estadoData || []).find(e =>
      e.estado?.toLowerCase().includes('paraliz')
    )?.monto_total ?? 0
    const montoEjecucion = (estadoData || []).find(e =>
      e.estado?.toLowerCase().includes('ejecuci')
    )?.monto_total ?? 0

    // 9. Entidades con más obras
    const { data: topEntidades } = await supabase
      .from('obras')
      .select('entidad')
      .not('entidad', 'is', null)
      .limit(1000)

    const entidadMap = {}
    ;(topEntidades || []).forEach(o => {
      const e = o.entidad?.trim()
      if (e) entidadMap[e] = (entidadMap[e] || 0) + 1
    })
    const rankEntidades = Object.entries(entidadMap)
      .map(([entidad, total]) => ({ entidad, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    return NextResponse.json({
      total,
      montoTotal,
      montoParalizado,
      montoEjecucion,
      estadoData:    estadoData    || [],
      anioData:      anioConMonto,
      topMunicipios: topMunicipios || [],
      bajoPorcentaje: bajoPorcentaje || [],
      rankEntidades,
      totalParalizadas: paralizadas?.length ?? 0,
    })
  } catch (err) {
    console.error('Error /api/estadisticas:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
