'use client'
import { useEffect, useState } from 'react'
import {
  AlertTriangle, Clock, DollarSign, MapPin,
  Building2, TrendingDown, ExternalLink
} from 'lucide-react'
import { formatSoles } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────────
function Badge({ children, color = 'red' }) {
  const colors = {
    red:    'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray:   'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

function StatCard({ title, value, subtitle, icon: Icon, color = 'red' }) {
  const colors = {
    red:    'bg-red-50 text-red-700 border-red-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
        </div>
        <Icon className="w-6 h-6 opacity-40" />
      </div>
    </div>
  )
}

function InfobrasLink({ obraId }) {
  return (
    <a
      href={`https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/Sumario?ObraId=${obraId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
    >
      Ver en InfoBras <ExternalLink className="w-3 h-3" />
    </a>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function IrregularidadesPage() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [tab, setTab]         = useState('paralizadas')

  useEffect(() => {
    fetch('/api/irregularidades')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Cargando irregularidades...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-red-700">
      <AlertTriangle className="w-5 h-5 mb-2" />
      <p className="font-medium">Error al cargar datos</p>
      <p className="text-sm mt-1">{error}</p>
    </div>
  )

  const { paralizadas, en_ejecucion_retraso, resumen, municipios_problematicos } = data

  const maxAnios = resumen.max_tiempo_paralizado
    ? (resumen.max_tiempo_paralizado / 365).toFixed(1)
    : '—'

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Cabecera ── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          Irregularidades y Alertas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Obras paralizadas y proyectos con posible retraso — Región Lambayeque
        </p>
      </div>

      {/* ── Tarjetas resumen ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Obras Paralizadas"
          value={resumen.total_paralizadas}
          subtitle="Ejecución detenida"
          icon={AlertTriangle}
          color="red"
        />
        <StatCard
          title="Monto Paralizado"
          value={`S/ ${(resumen.monto_paralizado / 1e6).toFixed(0)} M`}
          subtitle="Soles comprometidos sin avance"
          icon={DollarSign}
          color="red"
        />
        <StatCard
          title="Máx. Tiempo Paralizada"
          value={`${maxAnios} años`}
          subtitle="Obra paralizada más antigua"
          icon={Clock}
          color="orange"
        />
        <StatCard
          title="Posibles Retrasos"
          value={resumen.en_ejecucion_con_retraso}
          subtitle="En ejecución +3 años sin concluir"
          icon={TrendingDown}
          color="orange"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'paralizadas', label: `Obras Paralizadas (${paralizadas.length})` },
            { id: 'retrasos',    label: `Posibles Retrasos (${en_ejecucion_retraso.length})` },
            { id: 'municipios',  label: 'Por Municipio' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Paralizadas ── */}
      {tab === 'paralizadas' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Obras con estado "Paralizada" ordenadas por monto invertido.
            El tiempo paralizada se calcula desde la fecha de inicio de obra registrada en InfoBras.
          </p>
          {paralizadas.map((obra, i) => (
            <ObraCard key={obra.obra_id} obra={obra} index={i + 1} tipo="paralizada" />
          ))}
        </div>
      )}

      {/* ── Tab: Retrasos ── */}
      {tab === 'retrasos' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Obras "En Ejecución" con más de 3 años desde su fecha de inicio.
            Pueden tener ampliaciones de plazo no registradas o estar en situación irregular.
          </p>
          {en_ejecucion_retraso.map((obra, i) => (
            <ObraCard key={obra.obra_id} obra={obra} index={i + 1} tipo="retraso" />
          ))}
          {en_ejecucion_retraso.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-8">
              No hay obras con retraso detectado
            </p>
          )}
        </div>
      )}

      {/* ── Tab: Municipios ── */}
      {tab === 'municipios' && (
        <div>
          <p className="text-xs text-gray-500 mb-4">
            Municipios con mayor cantidad de obras paralizadas.
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Municipio</th>
                  <th className="px-4 py-3 text-right">Obras Paralizadas</th>
                  <th className="px-4 py-3 text-right">Monto Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {municipios_problematicos.map((m, i) => (
                  <tr key={m.municipio} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      {m.municipio}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium text-xs">
                        {m.paralizadas} obras
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 font-mono">
                      {formatSoles(m.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente: tarjeta de obra ───────────────────────────────────────────────
function ObraCard({ obra, index, tipo }) {
  const [expanded, setExpanded] = useState(false)

  const tiempoLabel = tipo === 'paralizada'
    ? obra.anios_paralizada ? `${obra.anios_paralizada} años paralizada` : 'Tiempo desconocido'
    : obra.anios_en_ejecucion ? `${obra.anios_en_ejecucion} años en ejecución` : null

  const badgeColor = tipo === 'paralizada' ? 'red' : 'orange'
  const badgeText  = tipo === 'paralizada' ? 'PARALIZADA' : 'POSIBLE RETRASO'

  const avance = obra.avance_fisico != null ? `${obra.avance_fisico}% avance` : 'Avance no registrado'

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="text-gray-400 font-mono text-sm w-6 flex-shrink-0 mt-0.5">
              {index}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge color={badgeColor}>{badgeText}</Badge>
                {tiempoLabel && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {tiempoLabel}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-900 mt-1 leading-snug line-clamp-2">
                {obra.nombre_obra}
              </p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {obra.municipio || 'Sin municipio'}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {(obra.entidad || 'Sin entidad').slice(0, 40)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-gray-900">
              {formatSoles(obra.monto_aprobado)}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">{avance}</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-3 mt-3 text-xs text-gray-600">
            <div>
              <span className="font-medium text-gray-500">Código InfoBras:</span>
              <p className="font-mono">{obra.obra_id}</p>
            </div>
            <div>
              <span className="font-medium text-gray-500">Fecha de inicio:</span>
              <p>{obra.fecha_inicio || 'No registrada'}</p>
            </div>
            <div className="col-span-2">
              <span className="font-medium text-gray-500">Entidad ejecutora:</span>
              <p>{obra.entidad || 'No registrada'}</p>
            </div>
          </div>
          <div className="mt-3">
            <InfobrasLink obraId={obra.obra_id} />
          </div>
        </div>
      )}
    </div>
  )
}
