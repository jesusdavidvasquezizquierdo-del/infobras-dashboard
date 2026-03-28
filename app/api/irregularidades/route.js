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

    // 1. Obras paralizadas — todas con detalle
    const { data: paralizadas, error: e1 } = await supabase
      .from('obras')
      .select('obra_id, nombre_obra, municipio, entidad, monto_aprobado, fecha_inicio, avance_fisico')
      .ilike('estado', '%paraliz%')
      .order('monto_aprobado', { ascending: false })

    if (e1) throw e1

    // 2. Obras en ejecución — posibles retrasos (sin fecha_fin o fecha_inicio muy antigua)
    const haceUnAnio = new Date()
    haceUnAnio.setFullYear(haceUnAnio.getFullYear() - 3)
    const fechaLimite = haceUnAnio.toISOString().split('T')[0]

    const { data: enEjecucion, error: e2 } = await supabase
      .from('obras')
      .select('obra_id, nombre_obra, municipio, entidad, monto_aprobado, fecha_inicio, avance_fisico')
      .ilike('estado', '%ejecuci%')
      .not('fecha_inicio', 'is', null)
      .lte('fecha_inicio', fechaLimite)   // inicio hace más de 3 años y aún en ejecución
      .order('fecha_inicio', { ascending: true })
      .limit(50)

    if (e2) throw e2

    // 3. Estadísticas de paralizadas
    const montoParalizado = (paralizadas || []).reduce(
      (sum, o) => sum + (o.monto_aprobado || 0), 0
    )

    // 4. Calcular tiempo paralizado para cada obra
    const hoy = new Date()
    const paralizadasConTiempo = (paralizadas || []).map(o => {
      const inicio = o.fecha_inicio ? new Date(o.fecha_inicio) : null
      const diasParalizada = inicio
        ? Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
        : null
      return {
        ...o,
        dias_paralizada: diasParalizada,
        anios_paralizada: diasParalizada ? (diasParalizada / 365).toFixed(1) : null,
      }
    })

    // 5. Obras en ejecución con posible retraso
    const enEjecucionConRetraso = (enEjecucion || []).map(o => {
      const inicio = o.fecha_inicio ? new Date(o.fecha_inicio) : null
      const diasEnEjecucion = inicio
        ? Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24))
        : null
      return {
        ...o,
        dias_en_ejecucion: diasEnEjecucion,
        anios_en_ejecucion: diasEnEjecucion ? (diasEnEjecucion / 365).toFixed(1) : null,
      }
    })

    // 6. Municipios con más problemas
    const municipioMap = {}
    ;[...(paralizadas || [])].forEach(o => {
      const m = o.municipio || 'Sin municipio'
      if (!municipioMap[m]) municipioMap[m] = { paralizadas: 0, monto: 0 }
      municipioMap[m].paralizadas++
      municipioMap[m].monto += o.monto_aprobado || 0
    })
    const municipiosProblematicos = Object.entries(municipioMap)
      .map(([municipio, data]) => ({ municipio, ...data }))
      .sort((a, b) => b.paralizadas - a.paralizadas)
      .slice(0, 10)

    return NextResponse.json({
      paralizadas:          paralizadasConTiempo,
      en_ejecucion_retraso: enEjecucionConRetraso,
      resumen: {
        total_paralizadas:       paralizadas?.length ?? 0,
        monto_paralizado:        montoParalizado,
        max_tiempo_paralizado:   Math.max(...paralizadasConTiempo.map(o => o.dias_paralizada || 0)),
        en_ejecucion_con_retraso: enEjecucion?.length ?? 0,
      },
      municipios_problematicos: municipiosProblematicos,
    })
  } catch (err) {
    console.error('Error /api/irregularidades:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
