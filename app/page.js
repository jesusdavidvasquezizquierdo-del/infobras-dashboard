// app/page.js — Dashboard principal (Server Component)
import { Suspense } from 'react'
import DashboardClient from './dashboard/DashboardClient'

export const dynamic = 'force-dynamic' // Siempre actualiza datos al cargar

export default function HomePage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white rounded-xl border border-slate-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 bg-white rounded-xl border border-slate-200" />
        <div className="h-80 bg-white rounded-xl border border-slate-200" />
      </div>
    </div>
  )
}
