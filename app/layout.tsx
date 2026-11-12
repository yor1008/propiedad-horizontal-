import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Atkinson_Hyperlegible_Next } from 'next/font/google'
import './globals.css'

// Una sola fuente variable (subconjunto latino, ~1 archivo): pesa poco y distingue bien 0/O y 1/I,
// útil para placas, documentos y números de apartamento.
// adjustFontFallback en false: Next no trae las métricas de esta fuente y avisaba en cada compilación.
const fontUi = Atkinson_Hyperlegible_Next({
  subsets: ['latin'], display: 'swap', variable: '--font-ui', adjustFontFallback: false,
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'Torres del Parque | Gestión residencial',
  description: 'Plataforma integral para la administración, operación y seguridad de comunidades residenciales.',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Permite usar env(safe-area-inset-*) para que nada quede tapado por la muesca o la barra del gesto.
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#f3f7fb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={fontUi.variable}>
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
