import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/auth-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { BillingProvider } from '@/components/providers/billing-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Studygram - AI-Powered Study Platform',
  description: 'Transform your learning experience with AI-powered study tools, course management, and collaborative features.',
  keywords: 'study, learning, AI, education, courses, assessment, collaboration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <BillingProvider>
              {children}
              <Toaster />
            </BillingProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
