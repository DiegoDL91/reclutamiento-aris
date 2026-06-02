"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Filter, Download, MessageCircle, MoreVertical, ExternalLink, Cpu, User } from 'lucide-react'

export default function ChatsPage() {
  const [conversaciones, setConversaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // LÓGICA PARA TRAER LOS CHATS REALES
  const cargarChats = async () => {
    const { data } = await supabase
      .from('candidatos_respuestas')
      .select('*')
      .order('fecha_registro', { ascending: false })
    
    setConversaciones(data || [])
    setLoading(setLoading(false) as any)
  }

  useEffect(() => {
    cargarChats()
  }, [])

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Centro de Mensajes</h1>
          <p className="text-sm text-slate-400 font-medium">Monitorea la actividad de ARIS en tiempo real vía WhatsApp</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} /> Exportar Excel
          </button>
          <button className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-bold text-xs shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
            <Filter size={16} /> Filtrar por Tipo
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y KPI RÁPIDO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-5 top-4 text-slate-300" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o número de teléfono..." 
            className="w-full bg-white border border-slate-100 rounded-[2rem] py-4 pl-14 pr-6 text-sm shadow-xl shadow-slate-100/50 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-4 flex items-center justify-between">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">Total Conversaciones <br/><span className="text-blue-600 text-lg font-black">{conversaciones.length} Registradas</span></p>
           <Cpu className="text-blue-200" size={32} />
        </div>
      </div>

      {/* TABLA DE INTELIGENCIA */}
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Candidato</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tipo de Conversación</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Último Análisis ARIS</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha Registro</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Score</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {conversaciones.length === 0 ? (
                <tr><td colSpan={6} className="p-20 text-center text-slate-300 italic font-bold">Esperando actividad en WhatsApp...</td></tr>
              ) : (
                conversaciones.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 text-sm uppercase">{item.nombre_completo || 'Candidato Nuevo'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.telefono_whatsapp}</p>
                    </td>
                    <td className="px-8 py-6">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black flex items-center gap-1.5 shadow-sm border border-blue-100 w-fit">
                        <Cpu size={12} /> ARIS AI
                      </span>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                      <p className="text-xs text-slate-500 italic truncate">"{item.analisis_final_aris || 'Sin mensajes aún...'}"</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-bold text-slate-700">{new Date(item.fecha_registro).toLocaleDateString()}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Activo</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black shadow-lg shadow-slate-200">
                        {item.calificacion_ia || 0}%
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm">
                          <MessageCircle size={18} />
                        </button>
                        <button className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 transition-all">
                          <ExternalLink size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Monitor de Mensajería Rio Logística</p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400">Anterior</button>
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  )
}