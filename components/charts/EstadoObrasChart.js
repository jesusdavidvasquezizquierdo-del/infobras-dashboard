'use client'
import {
  PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer
} from 'recharts'
import { ESTADO_COLORS, ESTADO_LABELS } from '@/lib/utils'

const RADIAN = Math.PI / 180

// Etiqueta personalizada dentro de cada sector
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.04) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
          fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

// Tooltip personalizado
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-2 text-sm">
      <p className="font-semibold text-slate-800">{ESTADO_LABELS[name] ?? name}</p>
      <p className="text-slate-600">{value.toLocaleString('es-PE')} obras</p>
    </div>
  )
}

/**
 * @param {Array<{estado: string, total: number}>} data
 */
export default function EstadoObrasChart({ data = [] }) {
  const chartData = data.map(d => ({
    name:  d.estado,
    value: d.total,
    color: ESTADO_COLORS[d.estado] ?? '#94a3b8',
  }))

  if (!chartData.length) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
        Sin datos disponibles
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={55}
          dataKey="value"
          labelLine={false}
          label={<CustomLabel />}
        >
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => ESTADO_LABELS[value] ?? value}
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
