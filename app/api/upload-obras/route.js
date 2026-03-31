import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Endpoint temporal para subir avance_fisico y monto_aprobado desde el navegador
// POST /api/upload-obras   body: JSON array de { obra_id, avance_fisico, monto_aprobado }

export async function POST(request) {
  try {
    const rows = await request.json()

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'Body must be a non-empty array' }, { status: 400 })
    }

    // Usar service role para writes (o anon si no está configurado)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabase
      .from('obras')
      .upsert(rows, { onConflict: 'obra_id' })

    if (error) {
      console.error('Supabase upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, count: rows.length })
  } catch (err) {
    console.error('Route error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Permitir desde cualquier origen (CORS para llamadas desde el browser)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
