'use client'
import { useState } from 'react'
import { Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { ESTADO_LABELS, formatSoles, formatDate, truncate } from '@/lib/utils'

const ESTADOS = ['Todos', 'En Ejecución', 'Concluido', 'Paralizada', 'Sin Ejecución']

const BADGE_CLASS = {
  'En Ejecución':  'badge badge-ejecucion',
  'Concluido':     'badge badge-terminada',
  'Paralizada':    'badge badge-paralizada',
  'Sin Ejecución': 'badge bg-slate-100 text-slate-500',
}

/**
 * @param {Array}    obras        - Array de obras de Supabase
 * @param {boolean}  loading      - Estado de carga
 * @param {number}   totalCount   - Total de registros (para paginación server-side)
 * @param {number}   page         - Página actual
 * @param {Function} onPageChange - Callback de cambio de página
 * @param {Function} onSearch     - Callback de búsqueda
 * @param {Function} onFilter     - Callback de filtro por estado
 */
export default function ObrasTable({
  obras = [],
  loading = false,
  totalCount = 0,
  page = 1,
  initialSearch = '',
  onPageChange,
  onSearch,
  onFilter,
}) {
  const [searchVal, setSearchVal] = useState(initialSearch)
  const [estado, setEstado] = useState('Todos')
  const PAGE_SIZE = 20
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const handleSearch = (e) => {
    setSearchVal(e.target.value)
    onSearch?.(e.target.value)
  }

  const handleFilter = (est) => {
    setEstado(est)
    onFilter?.(est === 'Todos' ? null : est)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Barra de filtros */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, municipio, código InfoBras o CUI…"
            value={searchVal}
            onChange={handleSearch}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
          />
        </div>

        {/* Filtro por estado */}
        <div className="flex gap-1.5 flex-wrap">
          {ESTADOS.map(est => (
            <button
              key={est}
              onClick={() => handleFilter(est)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                estado === est
                  ? 'bg-brand text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            Cargando obras...
          </div>
        ) : obras.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
            No se encontraron obras
          </div>
        ) : (
          <table className="table-infobras">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre de la Obra</th>
                <th>Municipio / Entidad</th>
                <th>Estado</th>
                <th>Monto (S/)</th>
                <th>Avance</th>
                <th>Inicio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {obras.map((obra) => (
                <tr key={obra.id ?? obra.obra_id}>
                  <td className="font-mono text-xs text-slate-500 whitespace-nowrap">
                    {obra.obra_id}
                  </td>
                  <td className="max-w-xs">
                    <span title={obra.nombre_obra} className="line-clamp-2 text-slate-800">
                      {truncate(obra.nombre_obra, 70)}
                    </span>
                  </td>
                  <td className="text-slate-500 text-xs max-w-[160px]">
                    {truncate(obra.municipio ?? obra.entidad, 35)}
                  </td>
                  <td>
                    <span className={BADGE_CLASS[obra.estado] ?? 'badge bg-slate-100 text-slate-600'}>
                      {obra.estado}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-right text-slate-700">
                    {formatSoles(obra.monto_aprobado)}
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-light rounded-full"
                          style={{ width: `${Math.min(obra.avance_fisico ?? 0, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {obra.avance_fisico ?? 0}%
                      </span>
                    </div>
                  </td>
                  <td className="text-xs text-slate-400 whitespace-nowrap">
                    {formatDate(obra.fecha_inicio)}
                  </td>
                  <td>
                    <a
                      href={`https://infobras.contraloria.gob.pe/InfobrasWeb/Mapa/Sumario?ObraId=${obra.obra_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 text-slate-400 hover:text-brand transition-colors"
                      title="Ver en InfoBras"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
        <p className="text-slate-500">
          {totalCount.toLocaleString('es-PE')} obras en total
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange?.(page - 1)}
            disabled={page <= 1}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-600 text-xs">
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange?.(page + 1)}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
