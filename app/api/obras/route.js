import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

const PAGE_SIZE = 20

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const page    = parseInt(searchParams.get('page') ?? '1')
    const search  = searchParams.get('q') ?? ''
    const estado  = searchParams.get('estado') ?? ''

    const supabase = getSupabase()
    const from = (page - 1) * PAGE_SIZE
    const to   = from + PAGE_SIZE - 1

    let query = supabase
      .from('obras')
      .select(
        'obra_id, nombre_obra, municipio, entidad, estado, ' +
        'monto_aprobado, avance_fisico, fecha_inicio',
        { count: 'exact' }
      )
      .order('monto_aprobado', { ascending: false })
      .range(from, to)

    if (search) {
      query = query.or(
        `nombre_obra.ilike.%${search}%,municipio.ilike.%${search}%`
      )
    }

    if (estado) {
      query = query.eq('estado', estado)
    }

    const { data: obras, count, error } = await query

    if (error) throw error

    return NextResponse.json({ obras: obras ?? [], count: count ?? 0 })
  } catch (error) {
    console.error('Error en /api/obras:', error)
    return NextResponse.json(
      { error: 'Error al obtener obras' },
      { status: 500 }
    )
  }
}
