'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { truncate } from '@/lib/utils'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  const formatted = new Intl.NumberFormat('es-PE', {
    style: 'currency', currency: 'PEN',
    notation: 'compact', maximumFractionDigits: 1,
  }).format(val)
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2 text-sm max-w-xs">
      <p className="font-semibold text-slate-800 mb-1 text-xs">{label}</p>
      <p className="text-brand font-bold">{formatted}</p>
    </div>
  )
}

/**
 * @param {Array<{municipio: string, monto_total: number}>} data
 */
export default function MontoMunicipioChart({ data = [] }) {
  const chartData = data
    .slice(0, 10)
    .map(d => ({
      ...d,
      label: truncate(d.municipio, 25),
    }))
    .sort((a, b) => a.monto_total - b.monto_total)

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Sin datos disponibles
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickFormatter={(v) =>
            new Intl.NumberFormat('es-PE', { notation: 'compact' }).format(v)
          }
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={120}
          tick={{ fontSize: 10, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
        <Bar
          dataKey="monto_total"
          fill="#2E75B6"
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
