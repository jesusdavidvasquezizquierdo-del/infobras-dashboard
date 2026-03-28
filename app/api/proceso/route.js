import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60   // segundos — requiere Vercel Pro o hobby con límite extendido

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Orden canónico de actividades en el proceso
const ACTIVITY_ORDER = [
  'A01_APROBACION_PROYECTO',
  'A02_ENTREGA_TERRENO',
  'A06_INICIO_OBRA',
  'A08_AVANCE_MENSUAL',
  'A09_FIN_PROGRAMADO',
  'A09_FIN_REPROGRAMADO',
  'A14_AMPLIACION_PLAZO',
  'A15_PARALIZACION',
  'A09_FIN_REAL',
  'A10_RECEPCION',
  'A18_LIQUIDACION',
]

const ACTIVITY_LABELS = {
  'A01_APROBACION_PROYECTO': 'Aprobación Proyecto',
  'A02_ENTREGA_TERRENO':     'Entrega Terreno',
  'A06_INICIO_OBRA':         'Inicio de Obra',
  'A08_AVANCE_MENSUAL':      'Avance Mensual',
  'A09_FIN_PROGRAMADO':      'Fin Programado',
  'A09_FIN_REPROGRAMADO':    'Fin Reprogramado',
  'A14_AMPLIACION_PLAZO':    'Ampliación de Plazo',
  'A15_PARALIZACION':        'Paralización',
  'A09_FIN_REAL':            'Fin Real',
  'A10_RECEPCION':           'Recepción Obra',
  'A18_LIQUIDACION':         'Liquidación',
}

const ACTIVITY_COLORS = {
  'A01_APROBACION_PROYECTO': '#3b82f6',
  'A02_ENTREGA_TERRENO':     '#6366f1',
  'A06_INICIO_OBRA':         '#22c55e',
  'A08_AVANCE_MENSUAL':      '#0ea5e9',
  'A09_FIN_PROGRAMADO':      '#f59e0b',
  'A09_FIN_REPROGRAMADO':    '#f97316',
  'A14_AMPLIACION_PLAZO':    '#8b5cf6',
  'A15_PARALIZACION':        '#ef4444',
  'A09_FIN_REAL':            '#10b981',
  'A10_RECEPCION':           '#14b8a6',
  'A18_LIQUIDACION':         '#64748b',
}

export async function GET() {
  try {
    const supabase = sb()

    // Obtener todos los eventos del event_log (Supabase max: 10,000 por request)
    const { data: events, error } = await supabase
      .from('event_log')
      .select('case_id, activity, timestamp, case_estado, case_provincia, case_monto')
      .order('case_id')
      .order('timestamp')
      .limit(10000)

    if (error) throw error

    if (!events || events.length === 0) {
      // Si no hay datos en event_log, intentar desde obras_detalle
      return await getFromObrasDetalle(supabase)
    }

    // ── Construir DFG ──────────────────────────────────────────────────────
    // Agrupar eventos por case_id, ordenados por timestamp
    const cases = {}
    for (const e of events) {
      if (!cases[e.case_id]) cases[e.case_id] = []
      cases[e.case_id].push(e)
    }

    // Contar frecuencias de actividades
    const actFreq = {}
    // Contar directly-follows
    const dfEdges = {}
    // Tiempos entre actividades (días)
    const edgeTimes = {}
    // Variantes del proceso
    const variantMap = {}

    let totalCases = 0
    const casesConParalizacion = new Set()
    const casesConAmpliacion = new Set()
    const casesCompletados = new Set()

    for (const [caseId, evts] of Object.entries(cases)) {
      totalCases++
      // Ordenar por timestamp
      evts.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))

      // Variante = secuencia de actividades únicas (sin duplicados consecutivos)
      const variant = []
      let prevEvt = null
      for (const e of evts) {
        const act = e.activity
        if (!actFreq[act]) actFreq[act] = 0
        actFreq[act]++

        if (act === 'A15_PARALIZACION') casesConParalizacion.add(caseId)
        if (act === 'A14_AMPLIACION_PLAZO') casesConAmpliacion.add(caseId)
        if (act === 'A18_LIQUIDACION' || act === 'A10_RECEPCION' || act === 'A09_FIN_REAL') {
          casesCompletados.add(caseId)
        }

        if (prevEvt && prevEvt.activity !== act) {
          const key = `${prevEvt.activity}→${act}`
          dfEdges[key] = (dfEdges[key] || 0) + 1

          // Calcular tiempo entre eventos
          if (prevEvt.timestamp && e.timestamp) {
            const d1 = new Date(prevEvt.timestamp)
            const d2 = new Date(e.timestamp)
            const days = Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
            if (days >= 0 && days < 3650) {
              if (!edgeTimes[key]) edgeTimes[key] = []
              edgeTimes[key].push(days)
            }
          }

          if (!variant.includes(act)) variant.push(act)
        }
        if (!variant.includes(act)) variant.push(act)
        prevEvt = e
      }

      // Registrar variante
      const varKey = variant.join(' → ')
      variantMap[varKey] = (variantMap[varKey] || 0) + 1
    }

    // Top variantes
    const variants = Object.entries(variantMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, count]) => ({ path, count, pct: Math.round((count / totalCases) * 100) }))

    // Nodos del DFG
    const nodes = Object.entries(actFreq).map(([id, freq]) => ({
      id,
      label: ACTIVITY_LABELS[id] || id,
      freq,
      color: ACTIVITY_COLORS[id] || '#94a3b8',
      order: ACTIVITY_ORDER.indexOf(id),
    })).sort((a, b) => a.order - b.order)

    // Aristas del DFG (top 20 por frecuencia)
    const edges = Object.entries(dfEdges)
      .map(([key, freq]) => {
        const [from, to] = key.split('→')
        const times = edgeTimes[key] || []
        return {
          from, to, freq,
          avg_days: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null,
        }
      })
      .sort((a, b) => b.freq - a.freq)
      .slice(0, 25)

    // Stats por actividad (para gráfico de barras)
    const actStats = nodes.map(n => ({
      activity: n.id,
      label: n.label,
      casos: actFreq[n.id] || 0,
      color: n.color,
    })).filter(a => a.activity !== 'A08_AVANCE_MENSUAL') // excluir avances (muchos)

    return NextResponse.json({
      source: 'event_log',
      resumen: {
        total_casos: totalCases,
        total_eventos: events.length,
        casos_paralizados: casesConParalizacion.size,
        casos_con_ampliacion: casesConAmpliacion.size,
        casos_completados: casesCompletados.size,
        actividades_unicas: nodes.length,
      },
      nodes,
      edges,
      variants,
      actStats,
    })

  } catch (err) {
    console.error('Error /api/proceso:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Fallback: construir process map desde obras_detalle (fechas del Excel)
async function getFromObrasDetalle(supabase) {
  const { data, error } = await supabase
    .from('obras_detalle')
    .select('obra_id, fecha_inicio, fecha_fin_programada, fecha_fin_reprogramada, fecha_fin_real, fecha_paralizacion, fecha_recepcion, fecha_liquidacion, fecha_entrega_terreno, causal_paralizacion, n_modif_plazo, provincia')

  if (error || !data?.length) {
    return NextResponse.json({ error: 'Sin datos en event_log ni obras_detalle' }, { status: 404 })
  }

  const FECHA_ACTS = [
    ['fecha_entrega_terreno',  'A02_ENTREGA_TERRENO'],
    ['fecha_inicio',           'A06_INICIO_OBRA'],
    ['fecha_fin_programada',   'A09_FIN_PROGRAMADO'],
    ['fecha_paralizacion',     'A15_PARALIZACION'],
    ['fecha_fin_reprogramada', 'A09_FIN_REPROGRAMADO'],
    ['fecha_fin_real',         'A09_FIN_REAL'],
    ['fecha_recepcion',        'A10_RECEPCION'],
    ['fecha_liquidacion',      'A18_LIQUIDACION'],
  ]

  const actFreq = {}
  const dfEdges = {}
  const variantMap = {}
  const casesConParalizacion = new Set()
  const casesCompletados = new Set()
  let totalCases = 0

  for (const obra of data) {
    totalCases++
    const events = FECHA_ACTS
      .filter(([campo]) => obra[campo])
      .map(([campo, act]) => ({ act, date: obra[campo] }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const variant = []
    let prev = null
    for (const { act } of events) {
      actFreq[act] = (actFreq[act] || 0) + 1
      if (act === 'A15_PARALIZACION') casesConParalizacion.add(obra.obra_id)
      if (['A18_LIQUIDACION','A10_RECEPCION','A09_FIN_REAL'].includes(act)) casesCompletados.add(obra.obra_id)
      if (prev && prev !== act) {
        const key = `${prev}→${act}`
        dfEdges[key] = (dfEdges[key] || 0) + 1
      }
      if (!variant.includes(act)) variant.push(act)
      prev = act
    }
    if (variant.length) {
      const vk = variant.join(' → ')
      variantMap[vk] = (variantMap[vk] || 0) + 1
    }
  }

  const nodes = Object.entries(actFreq).map(([id, freq]) => ({
    id, label: ACTIVITY_LABELS[id] || id, freq,
    color: ACTIVITY_COLORS[id] || '#94a3b8',
    order: ACTIVITY_ORDER.indexOf(id),
  })).sort((a, b) => (a.order === -1 ? 99 : a.order) - (b.order === -1 ? 99 : b.order))

  const edges = Object.entries(dfEdges)
    .map(([key, freq]) => { const [from,to]=key.split('→'); return { from, to, freq, avg_days: null } })
    .sort((a,b) => b.freq - a.freq).slice(0, 25)

  const variants = Object.entries(variantMap)
    .sort((a,b) => b[1]-a[1]).slice(0,8)
    .map(([path, count]) => ({ path, count, pct: Math.round((count/totalCases)*100) }))

  const casesConAmpliacion = data.filter(o => o.n_modif_plazo > 0).length

  return NextResponse.json({
    source: 'obras_detalle',
    resumen: {
      total_casos: totalCases,
      total_eventos: Object.values(actFreq).reduce((a,b)=>a+b,0),
      casos_paralizados: casesConParalizacion.size,
      casos_con_ampliacion: casesConAmpliacion,
      casos_completados: casesCompletados.size,
      actividades_unicas: nodes.length,
    },
    nodes, edges, variants,
    actStats: nodes.map(n => ({ activity: n.id, label: n.label, casos: n.freq, color: n.color })),
  })
}
