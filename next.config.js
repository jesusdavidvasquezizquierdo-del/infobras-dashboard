/** @type {import('next').NextConfig} */
const nextConfig = {
  // Permitir imágenes desde Supabase Storage si se usan en el futuro
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  // Variables de entorno públicas (disponibles en el cliente)
  env: {
    NEXT_PUBLIC_APP_NAME: 'InfoBras Dashboard',
    NEXT_PUBLIC_REGION: 'Lambayeque',
  },
}

module.exports = nextConfig
