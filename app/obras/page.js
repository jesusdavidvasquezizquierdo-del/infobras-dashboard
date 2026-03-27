'use client'
import { useEffect, useState, useCallback } from 'react'
import ObrasTable from '@/components/tables/ObrasTable'

export default function ObrasPage() {
  const [obras, setObras]       = useState([])
  const [count, setCount]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [estado, setEstado]     = useState('')

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

  // Debounce de búsqueda
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
        onPageChange={setPage}
        onSearch={handleSearch}
        onFilter={handleFilter}
      />
    </div>
  )
}
