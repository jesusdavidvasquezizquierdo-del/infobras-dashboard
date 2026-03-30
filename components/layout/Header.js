'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, RefreshCw, ExternalLink, Search } from 'lucide-react'

const PAGE_TITLES = {
  '/':               'Dashboard General',
  '/obras':          'Obras Públicas',
  '/estadisticas':   'Estadísticas y Análisis',
  '/proceso':        'Proceso de Ejecución (DFG)',
  '/irregularidades':'Detección de Irregularidades',
  '/cuellos-botella':'Cuellos de Botella',
  '/configuracion':  'Configuración',
}

export default function Header() {
  const pathname = usePathname()
  const router   = useRouter()
  const title    = PAGE_TITLES[pathname] ?? 'InfoBras Dashboard'
  const [q, setQ] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    const term = q.trim()
    if (term) {
      router.push(`/obras?q=${encodeURIComponent(term)}`)
      setQ('')
    }
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm">
      {/* Título de la página actual */}
      <h1 className="text-slate-800 font-semibold text-base shrink-0 w-44 truncate">{title}</h1>

      {/* Búsqueda global */}
      <form onSubmit={handleSearch} className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por CUI, código InfoBras o nombre…"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand
                       placeholder:text-slate-400 bg-slate-50 hover:bg-white transition-colors"
          />
        </div>
      </form>

      {/* Indicador de fuente de datos */}
      <a
        href="https://infobras.contraloria.gob.pe"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand transition-colors shrink-0"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        infobras.contraloria.gob.pe
      </a>

      {/* Última actualización */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Datos 2024</span>
      </div>

      {/* Notificaciones (placeholder) */}
      <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors shrink-0">
        <Bell className="w-4 h-4 text-slate-500" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
      </button>
    </header>
  )
}
