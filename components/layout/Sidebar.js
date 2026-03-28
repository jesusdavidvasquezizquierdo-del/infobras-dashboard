'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Building2, BarChart3,
  GitBranch, AlertTriangle, Settings, ChevronRight, Workflow
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Obras',
    href: '/obras',
    icon: Building2,
  },
  {
    label: 'Estadísticas',
    href: '/estadisticas',
    icon: BarChart3,
  },
  {
    label: 'Cuellos de Botella',
    href: '/cuellos-botella',
    icon: Workflow,
  },
  {
    label: 'Irregularidades',
    href: '/irregularidades',
    icon: AlertTriangle,
  },
  {
    label: 'Proceso (DFG)',
    href: '/proceso',
    icon: GitBranch,
  },
  {
    label: 'Configuración',
    href: '/configuracion',
    icon: Settings,
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [totalObras, setTotalObras] = useState(null)

  useEffect(() => {
    fetch('/api/stats')
      .then(r => r.json())
      .then(data => { if (data.total) setTotalObras(data.total) })
      .catch(() => {})
  }, [])

  return (
    <aside className="w-60 flex-shrink-0 bg-brand flex flex-col shadow-xl">
      {/* Logo / título */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">InfoBras</p>
            <p className="text-white/60 text-xs">Dashboard</p>
          </div>
        </div>
        <p className="mt-2 text-white/50 text-xs">
          Región Lambayeque · {totalObras ? totalObras.toLocaleString('es-PE') : '…'} obras
        </p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white/40 text-xs text-center">
          Datos: Contraloría General<br />
          del Perú — InfoBras 2024
        </p>
      </div>
    </aside>
  )
}
