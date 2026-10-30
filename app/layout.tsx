import type { Metadata, Viewport } from 'next'
import './globals.css'
import TourProvider from '@/components/tour/TourProvider'

export const metadata: Metadata = {
  title: 'Innovation HUB - Eurofarma',
  description: 'Plataforma de inovação colaborativa. Versão de demonstração com dados simulados.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Innovation HUB',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#06081a',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('ih-dark-mode')==='true';if(d)document.documentElement.setAttribute('data-theme','dark');}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {children}
        <TourProvider />
      </body>
    </html>
  )
}
