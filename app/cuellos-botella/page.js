'use client'
import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, CartesianGrid,
} from 'recharts'
import {
  AlertTriangle, Clock, TrendingUp, DollarSign,
  ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react'
import { formatSoles } from '@/lib/utils'

// ── Paleta de colores ─────────────────────────────────────────────────────────
const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, value, sub, color = 'brand', danger }) {
  const colorMap = {
    brand:  'text-brand',
    red:    'text-red-600',
    orange: 'text-orange-500',
    green:  'text-emerald-600',
    purple: 'text-purple-600',
  }
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-5 flex gap-4 items-start ${danger ? 'border-red-200' : 'border-slate-200'}`}>
      <div className={`p-2.5 rounded-lg ${danger ? 'bg-red-50' : 'bg-slate-50'}`}>
        <Icon className={`w-5 h-5 ${colorMap[color]}`} />
      </div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Sección header ────────────────────────────────────────────────────────────
function SectionTitle({ title, sub }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Tooltip personalizado ─────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <span className="font-semibold">{typeof p.value === 'number' ? p.value.toLocaleString('es-PE') : p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Row expandible para tabla de ampliaciones ─────────────────────────────────
function AmpliacionRow({ item }) {
  const pct = item.monto_aprobado_soles
    ? Math.round((item.monto_adicionales / item.monto_aprobado_soles) * 100)
    : 0
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 text-sm">
      <td className="py-2 px-3 font-mono text-xs text-slate-400">{item.obra_id}</td>
      <td className="py-2 px-3 text-slate-700 max-w-xs">
        <span className="line-clamp-2" title={item.nombre_obra}>{item.nombre_obra}</span>
      </td>
      <td className="py-2 px-3 text-slate-500 text-xs">{item.provincia}</td>
      <td className="py-2 px-3 text-center">
        <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
          {item.n_modif_plazo}x
        </span>
      </td>
      <td className="py-2 px-3 text-slate-500 text-xs text-center">{item.dias_modif_plazo ?? '—'} días</td>
      <td className="py-2 px-3 text-right text-slate-600 text-xs">{formatSoles(item.monto_adicionales)}</td>
      <td className="py-2 px-3 text-center">
        {pct > 0 && (
          <span className={`text-xs font-semibold ${pct > 25 ? 'text-red-600' : 'text-orange-500'}`}>
            +{pct}%
          </span>
        )}
      </td>
      <td className="py-2 px-3">
        <a
          href={`https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/Sumario?ObraId=${item.obra_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-slate-300 hover:text-brand"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </td>
    </tr>
  )
}

// ── Tabla de contratistas problemáticos ───────────────────────────────────────
function ContratistaRow({ item, rank }) {
  const score = item.obras_gran_retraso * 3 + item.obras_mult_ampliaciones * 2 + item.obras_con_controversia
  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/50 text-sm">
      <td className="py-2 px-3 text-center text-xs font-bold text-slate-400">#{rank}</td>
      <td className="py-2 px-3">
        <p className="text-slate-700 font-medium text-xs">{item.contratista}</p>
        {item.ruc && <p className="text-slate-400 text-xs">RUC: {item.ruc}</p>}
      </td>
      <td className="py-2 px-3 text-center text-xs">{item.total_obras}</td>
      <td className="py-2 px-3 text-center">
        {item.obras_gran_retraso > 0 && (
          <span className="bg-red-100 text-red-700 text-xs font-bold px-1.5 py-0.5 rounded">
            {item.obras_gran_retraso}
          </span>
        )}
      </td>
      <td className="py-2 px-3 text-center text-xs text-orange-600">{item.obras_mult_ampliaciones}</td>
      <td className="py-2 px-3 text-center text-xs text-purple-600">{item.obras_con_controversia}</td>
      <td className="py-2 px-3 text-right text-xs text-slate-600">{formatSoles(item.monto_adicionales_total)}</td>
      <td className="py-2 px-3 text-center">
        <span className={`text-xs font-bold ${score >= 5 ? 'text-red-600' : score >= 3 ? 'text-orange-500' : 'text-slate-400'}`}>
          {score}
        </span>
      </td>
    </tr>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function CuellosBotellaPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('causales')
  const [showAllProv, setShowAllProv] = useState(false)

  useEffect(() => {
    fetch('/api/cuellos-botella')
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      Cargando análisis de cuellos de botella…
    </div>
  )

  if (!data || data.error) return (
    <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
      {data?.error ?? 'Sin datos disponibles aún'}
      <span className="ml-2 text-xs text-slate-300">(Ejecuta el script de extracción primero)</span>
    </div>
  )

  const { resumen, causales, retrasos_provincia, contratistas, ampliaciones } = data

  // Datos para gráfico de causales
  const causalesChart = causales.map(c => ({
    name: c.causal.length > 35 ? c.causal.slice(0, 33) + '…' : c.causal,
    obras: c.total_obras,
    dias: c.dias_promedio,
  }))

  // Datos para gráfico de retrasos por provincia
  const provChart = retrasos_provincia.slice(0, 10).map(p => ({
    name: p.provincia,
    retraso: p.retraso_promedio_dias,
    obras: p.obras_con_retraso,
  }))

  const provMostrar = showAllProv ? retrasos_provincia : retrasos_provincia.slice(0, 6)

  const TABS = [
    { id: 'causales',    label: 'Causales de Paralización' },
    { id: 'retrasos',    label: 'Retrasos por Provincia' },
    { id: 'contratistas',label: 'Contratistas' },
    { id: 'ampliaciones',label: 'Ampliaciones de Plazo' },
  ]

  return (
    <div className="p-6 space-y-8 max-w-screen-xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Análisis de Cuellos de Botella</h1>
        <p className="text-sm text-slate-500 mt-1">
          Obras de Lambayeque · Extraído de InfoBras DataSets · {resumen.total_obras} obras analizadas
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Clock}
          label="Obras con retraso"
          value={`${resumen.obras_con_retraso}`}
          sub={`${resumen.pct_con_retraso}% del total · prom. ${resumen.retraso_promedio_dias} días`}
          color="orange"
          danger
        />
        <KPICard
          icon={AlertTriangle}
          label="Obras paralizadas"
          value={resumen.obras_paralizadas}
          sub="Con causal registrada"
          color="red"
          danger
        />
        <KPICard
          icon={TrendingUp}
          label="Con ampliaciones"
          value={resumen.obras_con_ampliacion}
          sub="Modificaciones de plazo"
          color="purple"
        />
        <KPICard
          icon={DollarSign}
          label="Monto adicionales"
          value={formatSoles(resumen.monto_adicionales_total)}
          sub="Total adicionales de obra"
          color="brand"
        />
      </div>

      {/* Tabs de análisis */}
      <div>
        <div className="flex gap-1 flex-wrap border-b border-slate-200 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-brand text-brand'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Causales de Paralización ── */}
        {tab === 'causales' && (
          <div className="space-y-6">
            <SectionTitle
              title="Causas más frecuentes de paralización"
              sub="Agrupadas por causal registrada en InfoBras"
            />

            {causales.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">
                Sin datos de paralización disponibles. Ejecuta el script de extracción primero.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico barras horizontal */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <p className="text-xs font-medium text-slate-500 mb-4">Obras por causal</p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={causalesChart} layout="vertical" margin={{ left: 0, right: 30 }}>
                      <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={170} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="obras" name="Obras" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabla de causales */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Detalle por causal</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Causal</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Obras</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-slate-500">Días prom.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {causales.map((c, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-2 text-xs text-slate-700">{c.causal}</td>
                            <td className="px-3 py-2 text-center">
                              <span className="font-bold text-red-600">{c.total_obras}</span>
                            </td>
                            <td className="px-3 py-2 text-center text-xs text-slate-500">
                              {c.dias_promedio || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Retrasos por Provincia ── */}
        {tab === 'retrasos' && (
          <div className="space-y-6">
            <SectionTitle
              title="Retrasos en ejecución por provincia"
              sub="Diferencia entre fecha de finalización real y programada"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <p className="text-xs font-medium text-slate-500 mb-4">Retraso promedio por provincia (días)</p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={provChart} margin={{ bottom: 30 }}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="retraso" name="Retraso prom. (días)" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabla */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Ranking de retrasos</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Provincia</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-slate-500">Con retraso</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-slate-500">Prom. días</th>
                        <th className="text-center px-2 py-2 text-xs font-medium text-slate-500">Máx. días</th>
                      </tr>
                    </thead>
                    <tbody>
                      {provMostrar.map((p, i) => (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                          <td className="px-4 py-2 text-xs font-medium text-slate-700">{p.provincia}</td>
                          <td className="px-2 py-2 text-center">
                            <span className="text-xs text-orange-600 font-semibold">{p.obras_con_retraso}</span>
                            <span className="text-xs text-slate-400"> / {p.total_obras}</span>
                          </td>
                          <td className="px-2 py-2 text-center text-xs text-slate-600">
                            {p.retraso_promedio_dias ? `${p.retraso_promedio_dias}d` : '—'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span className={`text-xs font-bold ${p.retraso_maximo_dias > 365 ? 'text-red-600' : 'text-slate-500'}`}>
                              {p.retraso_maximo_dias ? `${p.retraso_maximo_dias}d` : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {retrasos_provincia.length > 6 && (
                  <button
                    onClick={() => setShowAllProv(!showAllProv)}
                    className="w-full py-2 text-xs text-slate-400 hover:text-brand flex items-center justify-center gap-1 border-t border-slate-100"
                  >
                    {showAllProv ? <><ChevronUp className="w-3 h-3" />Ver menos</> : <><ChevronDown className="w-3 h-3" />Ver las {retrasos_provincia.length} provincias</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Contratistas ── */}
        {tab === 'contratistas' && (
          <div className="space-y-4">
            <SectionTitle
              title="Contratistas con mayor incidencia de problemas"
              sub="Obras con retraso >180 días, múltiples ampliaciones o controversias"
            />
            {contratistas.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Sin datos suficientes</p>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500">#</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500 text-left">Contratista</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500">Obras</th>
                        <th className="px-3 py-3 text-xs font-medium text-red-500">Retraso &gt;180d</th>
                        <th className="px-3 py-3 text-xs font-medium text-orange-500">+3 ampl.</th>
                        <th className="px-3 py-3 text-xs font-medium text-purple-500">Controversias</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500 text-right">Adicionales</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contratistas.map((c, i) => (
                        <ContratistaRow key={i} item={c} rank={i + 1} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
                  Score = (Retraso&gt;180d × 3) + (Ampliaciones × 2) + Controversias
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Ampliaciones de Plazo ── */}
        {tab === 'ampliaciones' && (
          <div className="space-y-4">
            <SectionTitle
              title="Obras con mayor cantidad de ampliaciones de plazo"
              sub="Modificaciones contractuales que extendieron el plazo original"
            />
            {ampliaciones.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Sin datos de ampliaciones disponibles</p>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500 text-left">ID</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500 text-left">Obra</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500">Provincia</th>
                        <th className="px-3 py-3 text-xs font-medium text-orange-500">Ampliaciones</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500">Días totales</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500 text-right">Monto adic.</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500">% del monto</th>
                        <th className="px-3 py-3 text-xs font-medium text-slate-500"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {ampliaciones.map((item, i) => (
                        <AmpliacionRow key={i} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
                  Fuente: InfoBras DataSets (Obras Públicas, Paralizadas, Reconstrucción)
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nota metodológica */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-700">
        <strong>Nota metodológica:</strong> Los datos provienen de los DataSets oficiales de InfoBras descargados el 27/03/2026.
        El retraso se calcula como la diferencia entre la fecha de finalización real y la programada.
        Las obras sin fecha de finalización real no están incluidas en el cálculo de retrasos.
        Para ver la línea de tiempo de eventos individuales por obra, visita la sección Obras y haz clic en el ícono de InfoBras.
      </div>
    </div>
  )
}
