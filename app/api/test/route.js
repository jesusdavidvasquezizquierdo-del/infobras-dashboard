import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 1. Verificar que las variables de entorno existen
  const envStatus = {
    url_presente:  !!url,
    key_presente:  !!key,
    url_valor:     url  ? url.substring(0, 30) + '...' : 'NO CONFIGURADA',
    key_tipo:      key  ? key.substring(0, 20) + '...' : 'NO CONFIGURADA',
  }

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      etapa: 'variables_entorno',
      mensaje: '❌ Faltan variables de entorno. Revisa tu archivo .env.local',
      envStatus,
    })
  }

  // 2. Intentar crear cliente y hacer una consulta simple
  try {
    const supabase = createClient(url, key)

    const { data, error, count } = await supabase
      .from('obras')
      .select('obra_id, nombre_obra', { count: 'exact' })
      .limit(1)

    if (error) {
      return NextResponse.json({
        ok: false,
        etapa: 'consulta_supabase',
        mensaje: '❌ Error al consultar Supabase',
        error_code:    error.code,
        error_message: error.message,
        error_hint:    error.hint,
        envStatus,
      })
    }

    return NextResponse.json({
      ok: true,
      mensaje: '✅ Conexión con Supabase OK',
      total_obras: count,
      muestra: data,
      envStatus,
    })
  } catch (e) {
    return NextResponse.json({
      ok: false,
      etapa: 'excepcion',
      mensaje: '❌ Excepción al conectar con Supabase',
      error: e.message,
      envStatus,
    })
  }
}
