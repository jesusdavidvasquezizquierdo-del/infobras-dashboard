'use client'
import { useEffect, useState } from 'react'
import {
  Building2, AlertTriangle, DollarSign,
  CheckCircle2, TrendingDown, Map
} from 'lucide-react'
import StatCard from '@/components/ui/StatCard'
import EstadoObrasChart from '@/components/charts/EstadoObrasChart'
import ObrasAnioChart from '@/components/charts/ObrasAnioChart'
import MontoMunicipioChart from '@/components/charts/MontoMunicipioChart'
import { formatSoles, pct } from '@/lib/utils'

export default function DashboardClient() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setStats(data)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <DashboardLoading />
  if (error)   return <DashboardError message={error} />

  const terminadas  = stats.terminadas ??
    stats.estadoData.find(e =>
      ['concluido','terminado','finalizado'].includes(e.estado?.toLowerCase())
    )?.total ?? 0
  const ejecucion   = stats.estadoData.find(e =>
    e.estado?.toLowerCase().includes('ejecuci')
  )?.total ?? 0
  const pctParaliz  = pct(stats.paralizadas, stats.total)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Fila 1: tarjetas estadísticas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total de Obras"
          value={stats.total.toLocaleString('es-PE')}
          subtitle="Departamento de Lambayeque"
          icon={Building2}
          color="brand"
        />
        <StatCard
          title="Monto Total Invertido"
          value={
            new Intl.NumberFormat('es-PE', {
              style: 'currency', currency: 'PEN',
              notation: 'compact', maximumFractionDigits: 1,
            }).format(stats.montoTotal)
          }
          subtitle="Suma de montos aprobados"
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Obras Paralizadas"
          value={stats.paralizadas.toLocaleString('es-PE')}
          subtitle={`${pctParaliz}% del total registrado`}
          icon={AlertTriangle}
          color="red"
          trend={-pctParaliz}
        />
        <StatCard
          title="Obras Terminadas"
          value={terminadas.toLocaleString('es-PE')}
          subtitle={`${pct(terminadas, stats.total)}% completadas`}
          icon={CheckCircle2}
          color="blue"
        />
      </div>

      {/* ── Fila 2: gráficos principales ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut por estado */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Distribución por Estado
          </h2>
          <EstadoObrasChart data={stats.estadoData} />
        </div>

        {/* Barras por año */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Obras por Año de Inicio (2004–2025)
          </h2>
          <ObrasAnioChart data={stats.anioData} />
        </div>
      </div>

      {/* ── Fila 3: top municipios ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Map className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-slate-700">
            Top 10 Municipios / Entidades por Monto Invertido
          </h2>
        </div>
        <MontoMunicipioChart data={stats.topMunicipios} />
      </div>

      {/* ── Fila 4: métricas rápidas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.estadoData.map(({ estado, total }) => {
          const pctVal = pct(total, stats.total)
          return (
            <div
              key={estado}
              className="bg-white rounded-lg border border-slate-200 p-3 text-center shadow-sm"
            >
              <p className="text-xl font-bold text-slate-800">
                {total.toLocaleString('es-PE')}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{estado}</p>
              <div className="mt-2 h-1 bg-slate-100 rounded-full">
                <div
                  className="h-full bg-brand-light rounded-full"
                  style={{ width: `${pctVal}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">{pctVal}%</p>
            </div>
          )
        })}
      </div>

    </div>
  )
}

function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-100 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-slate-100 rounded-xl" />
        <div className="h-80 bg-slate-100 rounded-xl" />
      </div>
    </div>
  )
}

function DashboardError({ message }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
      <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p className="font-semibold text-red-700">Error al cargar el dashboard</p>
      <p className="text-sm text-red-600 mt-1">{message}</p>
      <p className="text-xs text-red-400 mt-3">
        Verifica las variables de entorno de Supabase en .env.local
      </p>
    </div>
  )
}
