'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { BarChart3, Building2, DollarSign, TrendingDown } from 'lucide-react'
import { formatSoles } from '@/lib/utils'

const COLORES_ESTADO = {
  'Sin Ejecución': '#94a3b8',
  'Concluido':     '#22c55e',
  'En Ejecución':  '#3b82f6',
  'Paralizada':    '#ef4444',
}
const COLORES_PIE = ['#94a3b8', '#22c55e', '#3b82f6', '#ef4444', '#f59e0b']

const fmt = (n) => n >= 1e6
  ? `S/ ${(n / 1e6).toFixed(0)} M`
  : `S/ ${n?.toLocaleString('es-PE') ?? 0}`

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-700 mb-4">{title}</h2>
      {children}
    </div>
  )
}

export default function EstadisticasPage() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    fetch('/api/estadisticas')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Cargando estadísticas...</p>
      </div>
    </div>
  )
  if (error) return (
    <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700 text-sm">
      Error: {error}
    </div>
  )

  const { estadoData, anioData, topMunicipios, bajoPorcentaje,
          rankEntidades, total, montoTotal, montoParalizado, montoEjecucion } = data

  // Calcular % de monto paralizado
  const pctParalizado = montoTotal > 0
    ? ((montoParalizado / montoTotal) * 100).toFixed(1)
    : 0

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Cabecera ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          Estadísticas Detalladas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Análisis de inversión, distribución y cuellos de botella — Región Lambayeque
        </p>
      </div>

      {/* ── KPIs de inversión ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Obras',          val: total?.toLocaleString('es-PE'), sub: 'Lambayeque histórico',  icon: Building2,  color: 'blue'  },
          { label: 'Inversión Total',       val: fmt(montoTotal),               sub: 'Suma de montos aprobados', icon: DollarSign, color: 'green' },
          { label: 'Monto Paralizado',      val: fmt(montoParalizado),          sub: `${pctParalizado}% del total`,  icon: TrendingDown, color: 'red' },
          { label: 'Monto En Ejecución',    val: fmt(montoEjecucion),           sub: 'Obras activas actualmente', icon: BarChart3,  color: 'orange' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{k.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{k.val}</p>
                <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
              </div>
              <k.icon className="w-5 h-5 text-gray-300" />
            </div>
          </div>
        ))}
      </div>

      {/* ── Fila 2: Estado + Municipios ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Section title="Distribución por Estado de Obra">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={estadoData}
                dataKey="total"
                nameKey="estado"
                cx="50%" cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                label={({ estado, percent }) =>
                  `${estado?.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                }
              >
                {estadoData.map((e, i) => (
                  <Cell
                    key={e.estado}
                    fill={COLORES_ESTADO[e.estado] || COLORES_PIE[i % COLORES_PIE.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(v) => v.toLocaleString('es-PE')} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {estadoData.map((e, i) => (
              <div key={e.estado} className="flex items-center gap-2 text-xs text-gray-600">
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORES_ESTADO[e.estado] || COLORES_PIE[i] }}
                />
                <span className="truncate">{e.estado}</span>
                <span className="ml-auto font-mono">{e.total?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Top 10 Municipios por Inversión">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={(topMunicipios || []).slice(0, 10).map(m => ({
                ...m,
                monto_m: m.monto_total ? +(m.monto_total / 1e6).toFixed(0) : 0,
                municipio_corto: (m.municipio || '').slice(0, 12),
              }))}
              margin={{ left: 0, right: 10 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }}
                tickFormatter={v => `S/${v}M`} />
              <YAxis type="category" dataKey="municipio_corto"
                tick={{ fontSize: 10 }} width={80} />
              <Tooltip
                formatter={(v, n) => [`S/ ${v} M`, 'Monto']}
                labelFormatter={l => `Municipio: ${l}`}
              />
              <Bar dataKey="monto_m" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      </div>

      {/* ── Inversión por año ── */}
      <Section title="Inversión por Año de Inicio (en millones de soles)">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={(anioData || []).filter(a => a.anio >= 2005)}
            margin={{ left: 10, right: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="anio" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }}
              tickFormatter={v => `S/${v}M`} />
            <Tooltip
              formatter={(v) => [`S/ ${v} M`, 'Inversión']}
              labelFormatter={l => `Año ${l}`}
            />
            <Line
              type="monotone"
              dataKey="monto_millones"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Inversión (M)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Section>

      {/* ── Obras con bajo avance ── */}
      <Section title="⚠ Posibles Cuellos de Botella — Obras En Ejecución con Avance ≤ 30%">
        <p className="text-xs text-gray-500 mb-3">
          Obras activas con avance físico registrado menor al 30%.
          Pueden indicar problemas de ejecución, falta de presupuesto o paralizaciones no reportadas.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Obra</th>
                <th className="px-3 py-2 text-left">Municipio</th>
                <th className="px-3 py-2 text-right">Avance</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2 text-left">Inicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(bajoPorcentaje || []).map(o => (
                <tr key={o.obra_id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 max-w-xs">
                    <p className="line-clamp-2 text-gray-800">{o.nombre_obra}</p>
                    <p className="text-gray-400 font-mono">#{o.obra_id}</p>
                  </td>
                  <td className="px-3 py-2 text-gray-600">{o.municipio}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${o.avance_fisico}%` }}
                        />
                      </div>
                      <span className="font-mono text-orange-600">{o.avance_fisico}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">
                    {formatSoles(o.monto_aprobado)}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{o.fecha_inicio || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Top entidades ── */}
      <Section title="Entidades con Mayor Cantidad de Obras Registradas">
        <div className="space-y-2">
          {rankEntidades.map((e, i) => {
            const pct = total > 0 ? (e.total / total) * 100 : 0
            return (
              <div key={e.entidad} className="flex items-center gap-3">
                <span className="w-5 text-xs text-gray-400 font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-700 truncate">{e.entidad}</p>
                  <div className="mt-0.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${Math.min(pct * 5, 100)}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs font-mono text-gray-500 w-14 text-right">
                  {e.total.toLocaleString()} obras
                </span>
              </div>
            )
          })}
        </div>
      </Section>

    </div>
  )
}
