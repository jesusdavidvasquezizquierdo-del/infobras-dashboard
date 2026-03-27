'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2 text-sm">
      <p className="font-semibold text-slate-800 mb-1">Año {label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill }} className="text-xs">
          {p.value.toLocaleString('es-PE')} obras
        </p>
      ))}
    </div>
  )
}

/**
 * @param {Array<{anio: number, total: number}>} data
 */
export default function ObrasAnioChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Sin datos disponibles
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.total))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="anio"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={36}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.total === max ? '#1F4E79' : '#93c5fd'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
