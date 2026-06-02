"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Filter, MoreHorizontal, UserPlus, Calendar } from 'lucide-react'

export default function ProspectosPage() {
  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio", 
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ]
  const mesActualIndex = new Date().getMonth()
  const [mesSeleccionado, setMesSeleccionado] = useState(meses[mesActualIndex])
  const [prospectos, setProspectos] = useState<any[]>([])

  const cargarProspectos = async () => {
    const añoActual = new Date().getFullYear()
    const index = meses.indexOf(mesSeleccionado)
    const primerDia = new Date(añoActual, index, 1).toISOString()
    const ultimoDia = new Date(añoActual, index + 1, 0, 23, 59, 59).toISOString()

    // CAMBIO 1: Nombre de la tabla a 'candidatos_respuestas'
    const { data } = await supabase
      .from('candidatos_respuestas') 
      .select('*')
      .gte('fecha_registro', primerDia)
      .lte('fecha_registro', ultimoDia)
      .order('fecha_registro', { ascending: false })
    
    setProspectos(data || [])
  }

  useEffect(() => {
    cargarProspectos()
  }, [mesSeleccionado])

  const columnas = [
    { id: 'Nuevo', titulo: 'Nuevos', color: 'bg-blue-500' },
    { id: 'Pendiente', titulo: 'Pendientes', color: 'bg-amber-500' },
    { id: 'Optimo', titulo: 'Candidato Óptimo', color: 'bg-emerald-500' },
    { id: 'Rechazado', titulo: 'Rechazados', color: 'bg-rose-500' }
  ]

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Prospectos</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-slate-800">
              <Calendar size={14} className="text-blue-600" />
              <select 
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="text-xs font-black uppercase tracking-widest outline-none bg-transparent cursor-pointer"
              >
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Rio Logística 2026</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-blue-100 transition-all">
            <UserPlus size={16} /> Nueva Entrada
          </button>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-4 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Buscar candidato por nombre o teléfono..." 
          className="w-full bg-white border border-slate-100 rounded-[2rem] py-4 pl-14 pr-6 text-sm shadow-xl shadow-slate-100/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"
        />
      </div>

      <div className="flex gap-10 overflow-x-auto pb-10 min-h-[70vh]">
        {columnas.map((col) => (
          <div key={col.id} className="flex-shrink-0 w-80 space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${col.color} shadow-lg shadow-${col.color}/50`}></span>
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-[0.2em]">{col.titulo}</h3>
                <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black">
                  {prospectos.filter(p => p.estatus === col.id).length}
                </span>
              </div>
              <MoreHorizontal size={18} className="text-slate-300 cursor-pointer" />
            </div>

            <div className="bg-slate-50/40 p-4 rounded-[2.5rem] border border-slate-100 min-h-[500px] space-y-5">
              {prospectos.filter(p => p.estatus === col.id).map((p: any) => (
                <div key={p.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-tighter italic">ID: {p.id.slice(0,5)}</span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors uppercase">{p.nombre_completo || 'Candidato Nuevo'}</h4>
                  {/* CAMBIO 2: telefono a telefono_whatsapp */}
                  <p className="text-[10px] text-slate-400 font-bold mb-4 tracking-tight">{p.telefono_whatsapp}</p>
                  
                  <div className="pt-4 border-t border-slate-50 flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-[10px] font-black text-blue-500 shadow-inner italic">A</div>
                    {/* CAMBIO 3: resumen_ia a analisis_final_aris */}
                    <p className="text-[10px] text-slate-500 leading-tight line-clamp-2">"{p.analisis_final_aris || 'Analizando documentación...'}"</p>
                  </div>
                </div>
              ))}
              
              {prospectos.filter(p => p.estatus === col.id).length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] text-center px-10 italic space-y-2 opacity-50">
                  <div className="w-8 h-8 border-2 border-dashed border-slate-200 rounded-full"></div>
                  <span>Vacío</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}