# InfoBras Dashboard — Lambayeque

Visualizador web de obras públicas del departamento de Lambayeque, construido sobre los datos del sistema InfoBras de la Contraloría General de la República del Perú.

**Stack:** Next.js 14 · Supabase · Tailwind CSS · Recharts · Vercel

---

## Bloques de Desarrollo

| Bloque | Estado | Descripción |
|--------|--------|-------------|
| 1 | ✅ Listo | Setup: Next.js + Tailwind + componentes base |
| 2 | ⏳ Pendiente | Supabase: crear BD + importar datos |
| 3 | ⏳ Pendiente | API routes + conexión Supabase |
| 4 | ⏳ Pendiente | Dashboard: métricas y gráficos |
| 5 | ⏳ Pendiente | Visualizaciones avanzadas (DFG) |
| 6 | ⏳ Pendiente | Tabla filtrable de obras |
| 7 | ⏳ Pendiente | Deploy en Vercel |

---

## Instalación local (Bloque 1)

### Requisitos previos
- Node.js 18+
- Git
- Cuenta en GitHub, Supabase y Vercel (todas gratuitas)

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/infobras-dashboard.git
cd infobras-dashboard

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus claves de Supabase (ver Bloque 2)

# 4. Correr en desarrollo
npm run dev
# → Abre http://localhost:3000
```

---

## Estructura del proyecto

```
infobras-dashboard/
├── app/
│   ├── layout.js              # Layout principal con Sidebar y Header
│   ├── page.js                # Dashboard (página de inicio)
│   ├── obras/page.js          # Tabla de obras con filtros
│   ├── estadisticas/page.js   # Análisis estadístico
│   ├── proceso/page.js        # DFG — Directly Follows Graph
│   ├── irregularidades/page.js# Detección de anomalías
│   └── api/
│       ├── stats/route.js     # GET /api/stats
│       └── obras/route.js     # GET /api/obras?page=&q=&estado=
├── components/
│   ├── layout/                # Sidebar y Header
│   ├── ui/                    # StatCard y componentes reutilizables
│   ├── charts/                # Gráficos Recharts
│   └── tables/                # ObrasTable con paginación
├── lib/
│   ├── supabase.js            # Cliente de Supabase
│   └── utils.js               # Helpers (formatSoles, formatDate, etc.)
├── supabase/
│   ├── schema.sql             # DDL: tablas, índices, vistas, RLS
│   └── seed_from_sqlite.py    # Script migración SQLite → Supabase
└── .env.local.example         # Plantilla de variables de entorno
```

---

## Bloque 2 — Configurar Supabase

1. Ir a https://app.supabase.com → **New project**
2. Nombre: `infobras-lambayeque` | Región: `South America (São Paulo)`
3. En **SQL Editor → New Query**, copiar y ejecutar el contenido de `supabase/schema.sql`
4. Ir a **Settings → API** y copiar:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (solo para scripts)
5. Pegar en `.env.local`
6. Ejecutar `python supabase/seed_from_sqlite.py` para migrar los datos

---

## Bloque 7 — Deploy en Vercel

```bash
# Instalar Vercel CLI (opcional, se puede hacer desde el panel web)
npm i -g vercel
vercel

# En panel web: vercel.com → New Project → Import from GitHub
# Agregar variables de entorno en Settings → Environment Variables:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## Fuentes de datos

- **InfoBras:** https://infobras.contraloria.gob.pe
- **Contraloría General del Perú:** https://www.contraloria.gob.pe
- Datos correspondientes al Departamento de Lambayeque (codDepartamento=14)
- 4,248 obras registradas (2004–2025)
