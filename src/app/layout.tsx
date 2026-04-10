import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Play, UploadCloud, Library } from 'lucide-react'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'Homies | Premium Video Experience',
  description: 'Pro-grade video library with seamless playback powered by Mux.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable}`}>
        <nav className="navbar">
          <Link href="/" className="brand">
            <div className="brand-icon-wrapper">
              <Play size={22} fill="currentColor" />
            </div>
            <span>Homies <span className="responsive-hidden-text">or Tap</span></span>
          </Link>
          <div className="nav-links">
            <Link href="/" className="btn-secondary" style={{ border: 'none', background: 'none' }}>
              <Library size={18} />
              <span className="responsive-hidden-text">Library</span>
            </Link>
            <Link href="/upload" className="btn-primary">
              <UploadCloud size={18} />
              <span className="responsive-hidden-text">Upload</span>
            </Link>
          </div>
        </nav>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
