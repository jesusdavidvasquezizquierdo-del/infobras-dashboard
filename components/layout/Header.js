'use client'
import { usePathname } from 'next/navigation'
import { Bell, RefreshCw, ExternalLink } from 'lucide-react'

const PAGE_TITLES = {
  '/':               'Dashboard General',
  '/obras':          'Obras Públicas',
  '/estadisticas':   'Estadísticas y Análisis',
  '/proceso':        'Proceso de Ejecución (DFG)',
  '/irregularidades':'Detección de Irregularidades',
  '/configuracion':  'Configuración',
}

export default function Header() {
  const pathname = usePathname()
  const title = PAGE_TITLES[pathname] ?? 'InfoBras Dashboard'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm">
      {/* Título de la página actual */}
      <h1 className="text-slate-800 font-semibold text-base flex-1">{title}</h1>

      {/* Indicador de fuente de datos */}
      <a
        href="https://infobras.contraloria.gob.pe"
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 hover:text-brand transition-colors"
      >
        <ExternalLink className="w-3.5 h-3.5" />
        infobras.contraloria.gob.pe
      </a>

      {/* Última actualización */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Datos 2024</span>
      </div>

      {/* Notificaciones (placeholder) */}
      <button className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
        <Bell className="w-4 h-4 text-slate-500" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
      </button>
    </header>
  )
}
