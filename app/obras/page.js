'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import ObrasTable from '@/components/tables/ObrasTable'

// Componente interno que usa useSearchParams (requiere Suspense)
function ObrasContent() {
  const searchParams  = useSearchParams()
  const initialQ      = searchParams.get('q') ?? ''

  const [obras, setObras]     = useState([])
  const [count, setCount]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState(initialQ)
  const [estado, setEstado]   = useState('')

  const loadObras = useCallback(async (pg, q, est) => {
    setLoading(true)
    const params = new URLSearchParams({ page: pg })
    if (q)   params.append('q', q)
    if (est) params.append('estado', est)

    try {
      const res  = await fetch(`/api/obras?${params}`)
      const data = await res.json()
      setObras(data.obras ?? [])
      setCount(data.count ?? 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadObras(page, search, estado)
  }, [page, search, estado, loadObras])

  // Si cambia el parámetro q de la URL (p.ej. desde la búsqueda global del Header)
  useEffect(() => {
    if (initialQ !== search) {
      setPage(1)
      setSearch(initialQ)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ])

  const handleSearch = useCallback((q) => {
    setPage(1)
    const timer = setTimeout(() => setSearch(q), 400)
    return () => clearTimeout(timer)
  }, [])

  const handleFilter = useCallback((est) => {
    setPage(1)
    setEstado(est ?? '')
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Obras Públicas — Lambayeque</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Consulta y filtra las {count.toLocaleString('es-PE')} obras registradas en InfoBras
        </p>
      </div>
      <ObrasTable
        obras={obras}
        loading={loading}
        totalCount={count}
        page={page}
        initialSearch={initialQ}
        onPageChange={setPage}
        onSearch={handleSearch}
        onFilter={handleFilter}
      />
    </div>
  )
}

export default function ObrasPage() {
  return (
    <Suspense fallback={
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Cargando obras...
      </div>
    }>
      <ObrasContent />
    </Suspense>
  )
}
