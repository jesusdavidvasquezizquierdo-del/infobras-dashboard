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

    // 1. Total de obras (usa head:true — no trae filas, solo el conteo)
    const { count: total } = await supabase
      .from('obras')
      .select('*', { count: 'exact', head: true })

    // 2. Obras por estado — usa la vista v_stats_estado (agregación en servidor)
    const { data: estadoRaw, error: eErr } = await supabase
      .from('v_stats_estado')
      .select('estado, total, monto_total')

    // Fallback: si la vista no existe, usa RPC o query directa paginada
    let estadoData = []
    let montoTotal = 0

    if (!eErr && estadoRaw?.length) {
      estadoData = estadoRaw.map(r => ({
        estado: r.estado ?? 'Sin dato',
        total:  Number(r.total  ?? 0),
      }))
      montoTotal = estadoRaw.reduce(
        (acc, r) => acc + Number(r.monto_total ?? 0), 0
      )
    } else {
      // Plan B: consulta agrupada manual (máx 50 estados distintos)
      const { data: allEstados } = await supabase
        .from('obras')
        .select('estado')
        .limit(50000)   // traemos más filas para el conteo

      const map = {}
      allEstados?.forEach(({ estado }) => {
        const k = estado ?? 'Sin dato'
        map[k] = (map[k] ?? 0) + 1
      })
      estadoData = Object.entries(map).map(([estado, total]) => ({ estado, total }))
    }

    // 3. Obras por año — usa la vista v_obras_por_anio
    const { data: anioRaw, error: aErr } = await supabase
      .from('v_obras_por_anio')
      .select('anio, total')
      .order('anio')

    let anioData = []
    if (!aErr && anioRaw?.length) {
      anioData = anioRaw
        .filter(r => r.anio >= 2000 && r.anio <= 2026)
        .map(r => ({ anio: Number(r.anio), total: Number(r.total) }))
    }

    // 4. Monto total (si no lo obtuvimos de la vista)
    if (montoTotal === 0) {
      const { data: montoRaw } = await supabase
        .from('obras')
        .select('monto_aprobado')
        .not('monto_aprobado', 'is', null)
        .limit(50000)

      montoTotal = montoRaw?.reduce(
        (acc, { monto_aprobado }) => acc + (parseFloat(monto_aprobado) || 0), 0
      ) ?? 0
    }

    // 5. Top municipios — usa la vista v_top_municipios
    const { data: topRaw, error: mErr } = await supabase
      .from('v_top_municipios')
      .select('municipio, monto_total')
      .limit(10)

    let topMunicipios = []
    if (!mErr && topRaw?.length) {
      topMunicipios = topRaw.map(r => ({
        municipio:   r.municipio ?? 'Sin dato',
        monto_total: Number(r.monto_total ?? 0),
      }))
    }

    // 6. Obras paralizadas
    const paralizadas = estadoData.find(
      e => e.estado?.toLowerCase().includes('paraliz')
    )?.total ?? 0

    // 7. Obras terminadas / concluidas
    const terminadas = estadoData.find(
      e => e.estado?.toLowerCase().includes('conclu') ||
           e.estado?.toLowerCase().includes('termin') ||
           e.estado?.toLowerCase().includes('finaliz')
    )?.total ?? 0

    return NextResponse.json({
      total:        total ?? 0,
      paralizadas,
      terminadas,
      montoTotal,
      estadoData,
      anioData,
      topMunicipios,
    })

  } catch (error) {
    console.error('Error en /api/stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    )
  }
}
