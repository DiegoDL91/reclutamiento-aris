import './globals.css'
import SidebarLayout from './components/SidebarLayout'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex min-h-screen bg-white">
        <SidebarLayout>{children}</SidebarLayout>
      </body>
    </html>
  )
}