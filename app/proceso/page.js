'use client'
import { useState, useEffect, useRef } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts'
import { GitBranch, Activity, AlertTriangle, CheckCircle, Clock, Layers } from 'lucide-react'

// ── Utilidades ────────────────────────────────────────────────────────────────
const fmtDays = d => d >= 365 ? `${(d/365).toFixed(1)} años` : `${d} días`

// ── KPI ───────────────────────────────────────────────────────────────────────
function KPI({ icon: Icon, label, value, sub, color = 'brand' }) {
  const cls = { brand: 'text-brand', red: 'text-red-500', green: 'text-emerald-500', orange: 'text-orange-500', purple: 'text-purple-500' }
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex gap-3 items-start">
      <div className="p-2 rounded-lg bg-slate-50"><Icon className={`w-4 h-4 ${cls[color]}`} /></div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className={`text-xl font-bold ${cls[color]}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Nodo DFG ──────────────────────────────────────────────────────────────────
function DFGNode({ node, maxFreq, x, y, selected, onClick }) {
  const w = 130
  const h = 52
  const intensity = Math.max(0.15, node.freq / maxFreq)
  const isProblematic = ['A15_PARALIZACION', 'A14_AMPLIACION_PLAZO'].includes(node.id)
  const isEnd = ['A18_LIQUIDACION', 'A10_RECEPCION'].includes(node.id)
  const isStart = node.id === 'A06_INICIO_OBRA'

  return (
    <g
      transform={`translate(${x - w/2},${y - h/2})`}
      onClick={() => onClick(node)}
      style={{ cursor: 'pointer' }}
    >
      {/* Sombra */}
      <rect x={2} y={2} width={w} height={h} rx={8} fill="rgba(0,0,0,0.08)" />
      {/* Fondo */}
      <rect
        width={w} height={h} rx={8}
        fill={selected ? node.color : 'white'}
        stroke={selected ? node.color : (isProblematic ? '#fca5a5' : isEnd ? '#86efac' : isStart ? '#86efac' : node.color)}
        strokeWidth={selected ? 2.5 : 1.5}
        opacity={selected ? 1 : 0.95}
      />
      {/* Barra de intensidad en el fondo */}
      {!selected && (
        <rect
          width={w * intensity} height={h} rx={8}
          fill={node.color} opacity={0.08}
        />
      )}
      {/* Etiqueta */}
      <text
        x={w/2} y={h/2 - 6}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={10} fontWeight="600"
        fill={selected ? 'white' : '#1e293b'}
      >
        {node.label.length > 16 ? node.label.slice(0, 15) + '…' : node.label}
      </text>
      {/* Frecuencia */}
      <text
        x={w/2} y={h/2 + 9}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={9}
        fill={selected ? 'rgba(255,255,255,0.8)' : node.color}
        fontWeight="500"
      >
        {node.freq.toLocaleString('es-PE')} casos
      </text>
      {/* Badge problematic */}
      {isProblematic && !selected && (
        <circle cx={w - 8} cy={8} r={5} fill="#ef4444" />
      )}
      {isEnd && !selected && (
        <circle cx={w - 8} cy={8} r={5} fill="#22c55e" />
      )}
    </g>
  )
}

// ── Flecha DFG ────────────────────────────────────────────────────────────────
function DFGEdge({ x1, y1, x2, y2, freq, maxEdgeFreq, avgDays, highlight }) {
  const thickness = Math.max(1, Math.round((freq / maxEdgeFreq) * 6))
  const opacity = highlight ? 0.9 : Math.max(0.15, freq / maxEdgeFreq * 0.7)
  const color = highlight ? '#6366f1' : '#94a3b8'

  // Bezier curve
  const mx = (x1 + x2) / 2
  const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`

  const midX = (x1 * 0.125 + x2 * 0.875)
  const midY = (y1 * 0.125 + y2 * 0.875)

  return (
    <g>
      <defs>
        <marker id={`arrow-${Math.abs(x1+y1+x2+y2)}`} markerWidth="6" markerHeight="6"
          refX="3" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill={color} opacity={opacity} />
        </marker>
      </defs>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        opacity={opacity}
        markerEnd={`url(#arrow-${Math.abs(x1+y1+x2+y2)})`}
      />
      {/* Label de frecuencia */}
      {freq >= 5 && (
        <text x={midX} y={midY - 4} textAnchor="middle" fontSize={8} fill={highlight ? '#6366f1' : '#94a3b8'} fontWeight={highlight ? '700' : '400'}>
          {freq}{avgDays ? ` · ${fmtDays(avgDays)}` : ''}
        </text>
      )}
    </g>
  )
}

// ── LAYOUT DFG ────────────────────────────────────────────────────────────────
// Calcula posiciones de nodos en una cuadrícula de columnas
function computeLayout(nodes) {
  // Columnas del proceso (izquierda a derecha)
  const COLS = [
    ['A01_APROBACION_PROYECTO', 'A02_ENTREGA_TERRENO'],
    ['A06_INICIO_OBRA'],
    ['A08_AVANCE_MENSUAL', 'A14_AMPLIACION_PLAZO'],
    ['A15_PARALIZACION', 'A09_FIN_PROGRAMADO'],
    ['A09_FIN_REPROGRAMADO', 'A09_FIN_REAL'],
    ['A10_RECEPCION'],
    ['A18_LIQUIDACION'],
  ]

  const nodeIds = nodes.map(n => n.id)
  const OTROS = nodeIds.filter(id => !COLS.flat().includes(id))
  if (OTROS.length) COLS.push(OTROS)

  const COL_W = 170
  const ROW_H = 80
  const PAD_X = 90
  const PAD_Y = 50

  const positions = {}
  COLS.forEach((col, ci) => {
    col.forEach((id, ri) => {
      const x = PAD_X + ci * COL_W
      const totalH = (col.length - 1) * ROW_H
      const y = PAD_Y + 20 + ri * ROW_H - totalH / 2 + 80
      positions[id] = { x, y }
    })
  })

  const usedCols = COLS.filter(col => col.some(id => nodeIds.includes(id))).length
  const svgW = PAD_X * 2 + usedCols * COL_W
  const svgH = 280

  return { positions, svgW, svgH }
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function ProcesoPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [tab, setTab]         = useState('dfg')

  useEffect(() => {
    fetch('/api/proceso')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Calculando grafo de proceso…
    </div>
  )

  if (!data || data.error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <GitBranch className="w-10 h-10 text-slate-300" />
      <p className="text-slate-400 text-sm">{data?.error ?? 'Sin datos de eventos'}</p>
      <p className="text-xs text-slate-300 max-w-sm text-center">
        Ejecuta el scraper para obtener la línea de tiempo de eventos por obra,
        o ejecuta extraer_cuellos_botella.py para datos desde los Excel.
      </p>
    </div>
  )

  const { resumen, nodes, edges, variants, actStats, source } = data
  const maxFreq = Math.max(...nodes.map(n => n.freq), 1)
  const maxEdgeFreq = Math.max(...edges.map(e => e.freq), 1)
  const { positions, svgW, svgH } = computeLayout(nodes)

  // Edges conectadas al nodo seleccionado
  const highlightedEdges = selected
    ? new Set(edges.filter(e => e.from === selected.id || e.to === selected.id).map(e => `${e.from}→${e.to}`))
    : new Set()

  const TABS = [
    { id: 'dfg',       label: 'Grafo de Proceso (DFG)' },
    { id: 'variantes', label: 'Variantes' },
    { id: 'frecuencias', label: 'Frecuencia de Actividades' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-brand" />
            Proceso de Ejecución de Obras
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Directly-Follows Graph (DFG) · Región Lambayeque ·{' '}
            {source === 'obras_detalle'
              ? 'Datos desde DataSets Excel (fechas clave)'
              : 'Datos desde línea de tiempo InfoBras'}
          </p>
        </div>
        {source === 'obras_detalle' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 max-w-xs">
            <strong>Fuente:</strong> Fechas del Excel. Para ver eventos detallados, ejecuta el scraper de InfoBras.
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI icon={Layers}        label="Casos analizados"    value={resumen.total_casos.toLocaleString('es-PE')}    color="brand" />
        <KPI icon={Activity}      label="Eventos totales"     value={resumen.total_eventos.toLocaleString('es-PE')}  color="brand" />
        <KPI icon={CheckCircle}   label="Obras completadas"   value={resumen.casos_completados}                      sub={`${Math.round(resumen.casos_completados/resumen.total_casos*100)}% del total`} color="green" />
        <KPI icon={AlertTriangle} label="Paralizadas"         value={resumen.casos_paralizados}                      color="red" />
        <KPI icon={Clock}         label="Con ampliación"      value={resumen.casos_con_ampliacion}                   color="orange" />
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-slate-200 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-brand text-brand' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab DFG ── */}
        {tab === 'dfg' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

              {/* SVG del grafo */}
              <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Grafo DFG — Flujo de actividades</p>
                  <p className="text-xs text-slate-400">Haz clic en un nodo para ver sus conexiones</p>
                </div>
                <div className="overflow-x-auto">
                  <svg
                    width={svgW}
                    height={svgH}
                    viewBox={`0 0 ${svgW} ${svgH}`}
                    className="min-w-full"
                    style={{ background: '#f8fafc' }}
                  >
                    {/* Aristas */}
                    {edges.map((edge, i) => {
                      const from = positions[edge.from]
                      const to   = positions[edge.to]
                      if (!from || !to) return null
                      const key = `${edge.from}→${edge.to}`
                      return (
                        <DFGEdge
                          key={i}
                          x1={from.x + 65}  y1={from.y}
                          x2={to.x - 65}    y2={to.y}
                          freq={edge.freq}
                          maxEdgeFreq={maxEdgeFreq}
                          avgDays={edge.avg_days}
                          highlight={highlightedEdges.has(key)}
                        />
                      )
                    })}

                    {/* Nodos */}
                    {nodes.map(node => {
                      const pos = positions[node.id]
                      if (!pos) return null
                      return (
                        <DFGNode
                          key={node.id}
                          node={node}
                          maxFreq={maxFreq}
                          x={pos.x} y={pos.y}
                          selected={selected?.id === node.id}
                          onClick={n => setSelected(selected?.id === n.id ? null : n)}
                        />
                      )
                    })}
                  </svg>
                </div>

                {/* Leyenda */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Actividad problemática
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Actividad final
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-8 h-0.5 bg-slate-400 inline-block" /> Baja frecuencia
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-8 h-1.5 bg-indigo-500 inline-block" /> Alta frecuencia (seleccionada)
                  </span>
                </div>
              </div>

              {/* Panel lateral: detalle del nodo seleccionado */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                {selected ? (
                  <div className="space-y-4">
                    <div>
                      <div className="w-3 h-3 rounded-full inline-block mr-2" style={{ background: selected.color }} />
                      <span className="text-sm font-bold text-slate-800">{selected.label}</span>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono">{selected.id}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-2xl font-bold" style={{ color: selected.color }}>
                        {selected.freq.toLocaleString('es-PE')}
                      </p>
                      <p className="text-xs text-slate-500">ocurrencias en el log</p>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Transiciones salientes</p>
                      {edges.filter(e => e.from === selected.id).length === 0
                        ? <p className="text-xs text-slate-300">Ninguna</p>
                        : edges.filter(e => e.from === selected.id).map((e, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 text-xs">
                            <span className="text-slate-600">→ {(nodes.find(n=>n.id===e.to)?.label) ?? e.to}</span>
                            <span className="font-bold text-brand">{e.freq}</span>
                          </div>
                        ))
                      }
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Transiciones entrantes</p>
                      {edges.filter(e => e.to === selected.id).length === 0
                        ? <p className="text-xs text-slate-300">Ninguna</p>
                        : edges.filter(e => e.to === selected.id).map((e, i) => (
                          <div key={i} className="flex items-center justify-between py-1 border-b border-slate-50 text-xs">
                            <span className="text-slate-600">{(nodes.find(n=>n.id===e.from)?.label) ?? e.from} →</span>
                            <span className="font-bold text-slate-500">{e.freq}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-8">
                    <GitBranch className="w-8 h-8 text-slate-200" />
                    <p className="text-xs text-slate-400">Haz clic en cualquier nodo del grafo para ver sus detalles y conexiones</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Variantes ── */}
        {tab === 'variantes' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Top variantes del proceso — secuencias de actividades más frecuentes
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {variants.map((v, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-400">Variante #{i+1}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-brand">{v.count} casos</span>
                        <span className="text-xs text-slate-400">{v.pct}%</span>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2">
                      <div
                        className="h-1.5 rounded-full bg-brand"
                        style={{ width: `${v.pct}%` }}
                      />
                    </div>
                    {/* Actividades como chips */}
                    <div className="flex flex-wrap gap-1">
                      {v.path.split(' → ').map((act, j, arr) => {
                        const isProb = ['A15_PARALIZACION','A14_AMPLIACION_PLAZO'].includes(act)
                        const node = nodes.find(n => n.id === act)
                        return (
                          <span key={j} className="flex items-center gap-1">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                isProb ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {node?.label ?? act}
                            </span>
                            {j < arr.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab Frecuencias ── */}
        {tab === 'frecuencias' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <p className="text-xs font-medium text-slate-500 mb-4">
                Cantidad de casos en los que aparece cada actividad
              </p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={actStats} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={150} />
                  <Tooltip
                    formatter={(v, n) => [v.toLocaleString('es-PE'), 'Casos']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="casos" name="Casos" radius={[0, 4, 4, 0]}>
                    {actStats.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla de actividades */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500">Actividad</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">Frecuencia</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">% casos</th>
                  </tr>
                </thead>
                <tbody>
                  {actStats
                    .sort((a, b) => b.casos - a.casos)
                    .map((act, i) => (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-400">{act.activity}</td>
                        <td className="px-4 py-2">
                          <span className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: act.color }} />
                            <span className="text-slate-700 text-sm">{act.label}</span>
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-bold" style={{ color: act.color }}>
                          {act.casos.toLocaleString('es-PE')}
                        </td>
                        <td className="px-4 py-2 text-right text-xs text-slate-400">
                          {Math.round(act.casos / resumen.total_casos * 100)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Nota metodológica */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-700">
        <strong>¿Qué es el DFG?</strong> El Directly-Follows Graph (Grafo de Secuencias Directas) es la
        técnica base de la Minería de Procesos. Muestra qué actividades siguen a cuáles, con qué
        frecuencia. El grosor de las flechas representa la frecuencia de la transición.
        Los <span className="font-semibold">nodos rojos</span> (Paralización, Ampliación) son indicadores
        de irregularidades. Los <span className="font-semibold">nodos verdes</span> (Recepción, Liquidación)
        representan el final exitoso del proceso.
      </div>
    </div>
  )
}
