import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ChatbotWidget from '../components/ChatbotWidget'
import AuthProvider from './context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'KnowHere - AI-Powered Cloud Storage',
  description: 'Cloud storage with AI-powered file search',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
        </AuthProvider>

        <ChatbotWidget />
      </body>
    </html>
  )
}