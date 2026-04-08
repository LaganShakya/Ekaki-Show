import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Link from 'next/link'
import { Play, UploadCloud } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Advanced Video Hub',
  description: 'Premium video sharing with Mux chunked uploads',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="navbar">
          <Link href="/" className="brand">
            <Play size={24} color="var(--accent)" />
            <span>EkakiStream</span>
          </Link>
          <div className="nav-links">
            <Link href="/" className="btn-secondary" style={{ border: 'none' }}>
              Library
            </Link>
            <Link href="/upload" className="btn-primary">
              <UploadCloud size={18} />
              <span>Upload Video</span>
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
