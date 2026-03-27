import './globals.css'
import { Inter } from 'next/font/google'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'InfoBras Dashboard — Lambayeque',
  description:
    'Visualización de obras públicas del departamento de Lambayeque ' +
    'mediante Minería de Procesos sobre datos del sistema InfoBras - Contraloría General del Perú',
  keywords: ['InfoBras', 'obras públicas', 'Lambayeque', 'minería de procesos', 'Contraloría'],
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.className}>
      <body className="flex h-screen overflow-hidden bg-slate-50">
        {/* Sidebar fijo */}
        <Sidebar />

        {/* Contenido principal */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
