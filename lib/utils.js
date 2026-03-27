/**
 * Combina clases de Tailwind de forma segura (evita conflictos)
 * Uso: cn('px-4 py-2', isActive && 'bg-blue-500', className)
 */
export function cn(...inputs) {
  // Implementación manual sin clsx/tailwind-merge para no necesitar instalación extra
  return inputs
    .flat()
    .filter(Boolean)
    .join(' ')
    .split(' ')
    .filter((v, i, a) => {
      // Mantiene la última clase en caso de conflicto (simplificado)
      return a.lastIndexOf(v) === i
    })
    .join(' ')
}

/**
 * Formatea un número como moneda peruana (S/)
 */
export function formatSoles(amount) {
  if (!amount && amount !== 0) return '—'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formatea una fecha ISO a dd/mm/yyyy
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

/**
 * Convierte estado de InfoBras a etiqueta legible
 */
export const ESTADO_LABELS = {
  'En ejecucion':  'En Ejecución',
  'Terminada':     'Terminada',
  'Paralizada':    'Paralizada',
  'Por iniciar':   'Por Iniciar',
  'Liquidada':     'Liquidada',
  'Concluida':     'Concluida',
}

export const ESTADO_COLORS = {
  'En ejecucion': '#22c55e',
  'Terminada':    '#3b82f6',
  'Paralizada':   '#ef4444',
  'Por iniciar':  '#f59e0b',
  'Liquidada':    '#8b5cf6',
  'Concluida':    '#06b6d4',
}

/**
 * Calcula el porcentaje de un valor respecto al total
 */
export function pct(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

/**
 * Trunca texto a un número máximo de caracteres
 */
export function truncate(text, maxLength = 60) {
  if (!text) return ''
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text
}
