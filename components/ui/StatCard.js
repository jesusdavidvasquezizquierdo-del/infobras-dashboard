import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

/**
 * Tarjeta de estadística simple
 * @param {string}  title       - Título de la métrica
 * @param {string}  value       - Valor principal (ya formateado)
 * @param {string}  subtitle    - Descripción secundaria
 * @param {React.ReactNode} icon - Ícono de lucide-react
 * @param {string}  color       - Color del ícono: 'blue' | 'green' | 'red' | 'amber' | 'purple'
 * @param {number}  trend       - Porcentaje de cambio (+/-)
 */
export default function StatCard({
  title, value, subtitle, icon: Icon,
  color = 'blue', trend, className,
}) {
  const colorMap = {
    blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600'   },
    green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600' },
    red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600'     },
    amber:  { bg: 'bg-amber-50',  icon: 'bg-amber-100 text-amber-600' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600'},
    brand:  { bg: 'bg-blue-50',   icon: 'bg-brand/10 text-brand'      },
  }
  const c = colorMap[color] ?? colorMap.blue

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-200 p-5 shadow-sm',
        'hover:shadow-md transition-shadow animate-slide-up',
        className
      )}
    >
      <div className="flex items-start justify-between">
        {/* Ícono */}
        {Icon && (
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', c.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        )}

        {/* Tendencia */}
        {typeof trend === 'number' && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              trend > 0
                ? 'bg-green-50 text-green-700'
                : trend < 0
                  ? 'bg-red-50 text-red-700'
                  : 'bg-slate-100 text-slate-500'
            )}
          >
            {trend > 0
              ? <TrendingUp className="w-3 h-3" />
              : trend < 0
                ? <TrendingDown className="w-3 h-3" />
                : <Minus className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm font-medium text-slate-600 mt-0.5">{title}</p>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
