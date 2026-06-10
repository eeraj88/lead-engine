import type { Metadata } from 'next'
import { Sora, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'RAYLEAD Engine',
  description: 'Autonome Lead-Generation-Pipeline',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de" className={`${sora.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        <style>{`
          :root {
            --font-head: var(--font-sora, 'Sora', system-ui, sans-serif);
            --font-body: var(--font-inter, 'Inter', system-ui, sans-serif);
            --font-mono: var(--font-jetbrains, 'JetBrains Mono', ui-monospace, monospace);
          }
        `}</style>
      </head>
      <body style={{ fontFamily: 'var(--font-body)' }}>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0 }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
