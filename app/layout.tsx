"use client"
import { useState } from 'react'
import { usePathname } from 'next/navigation' // Para saber en qué página estamos
import Link from 'next/link' // Para navegar sin recargar
import { Menu, X, LayoutDashboard, Users, MessageSquare, Briefcase, Bell, Cpu } from 'lucide-react'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const pathname = usePathname() // Guardamos la ruta actual

  return (
    <html lang="es">
      <body className="flex min-h-screen bg-white">
        
        {/* SIDEBAR BLANCO */}
        <aside className={`${isOpen ? 'w-64' : 'w-20'} bg-white border-r border-slate-100 transition-all duration-300 flex flex-col h-screen sticky top-0`}>
          <div className="h-24 flex items-center px-4 border-b border-slate-50 overflow-hidden text-center">
            {/* Aquí va tu logo-hr.jpg */}
            <img src="/logo-hr.jpg" alt="Logo HR" className="h-16 w-auto mx-auto object-contain" />
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            {/* Aquí configuramos las rutas reales */}
            <NavItem href="/" icon={<LayoutDashboard size={20}/>} label="Inicio" isOpen={isOpen} active={pathname === '/'} />
            <NavItem href="/prospectos" icon={<Users size={20}/>} label="Prospectos" isOpen={isOpen} active={pathname === '/prospectos'} />
            <NavItem href="/chats" icon={<MessageSquare size={20}/>} label="Chats" isOpen={isOpen} active={pathname === '/chats'} />
            <NavItem href="/perfiles" icon={<Briefcase size={20}/>} label="Perfiles" isOpen={isOpen} active={pathname === '/perfiles'} />
          </nav>

          {/* FOOTER DEL MENÚ */}
          {isOpen && (
            <div className="p-4 border-t border-slate-50 text-[10px] text-slate-400 font-bold text-center leading-tight">
              RIO LOGÍSTICA 2026 <br/> 
              <span className="font-medium">Todos los derechos reservados</span>
            </div>
          )}
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-8 sticky top-0 z-10">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
              {isOpen ? <X size={24}/> : <Menu size={24}/>}
            </button>

            <div className="flex items-center gap-6">
              <Bell className="text-slate-300 cursor-pointer" size={20}/>
              <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
                <div className="text-right">
                  <p className="text-xs font-black text-slate-800 uppercase tracking-tighter italic">A.R.I.S. AI</p>
                  <p className="text-[10px] text-blue-500 font-bold uppercase italic animate-pulse">Core Online</p>
                </div>
                <div className="relative flex items-center justify-center">
                   <div className="absolute w-10 h-10 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                   <div className="relative w-10 h-10 bg-gradient-to-tr from-blue-700 to-blue-400 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                      <Cpu size={18} className="text-white" />
                   </div>
                </div>
              </div>
            </div>
          </header>
          <main className="p-8 bg-white">{children}</main>
        </div>
      </body>
    </html>
  )
}

// Componente para los botones del menú
function NavItem({ href, icon, label, isOpen, active = false }: any) {
  return (
    <Link href={href} className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-400 hover:bg-slate-50'}`}>
      <div className="shrink-0">{icon}</div>
      {isOpen && <span className="text-sm font-bold whitespace-nowrap">{label}</span>}
    </Link>
  )
}
