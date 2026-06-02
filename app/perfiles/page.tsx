import { supabase } from '../lib/supabase'
import { MapPin, Clock, ShieldCheck, Plus, Settings2, Trash2, Edit3 } from 'lucide-react'

export default async function PerfilesPage() {
  // Traemos la info real de la tabla vacantes
  const { data: vacantes } = await supabase
    .from('vacantes')
    .select('*')
    .order('cedis', { ascending: true })

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Configuración de Perfiles</h1>
          <p className="text-sm text-slate-400 font-medium">Define los requisitos que ARIS debe validar en cada CEDIS</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-xl transition-all">
          <Plus size={18} /> Crear Nuevo Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vacantes?.map((v: any) => (
          <div key={v.id} className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-100/50 overflow-hidden flex flex-col group hover:border-blue-500 transition-all">
            
            <div className="p-8 pb-6 border-b border-slate-50 relative">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">
                  {v.giro}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600"><Edit3 size={14}/></button>
                  <button className="p-2 bg-rose-50 text-rose-400 rounded-lg hover:text-rose-600"><Trash2 size={14}/></button>
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 leading-tight uppercase italic">{v.cedis}</h3>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tighter">{v.puesto}</p>
            </div>

            <div className="p-8 space-y-6 flex-1 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Ubicación</p>
                    <p className="text-[10px] font-bold text-slate-700">{v.ubicacion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                    <Clock size={14} />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Turnos</p>
                    <div className="flex flex-wrap gap-1">
                        {v.turnos?.map((t: string) => (
                            <span key={t} className="bg-purple-50 text-purple-600 text-[7px] px-1 rounded font-bold uppercase border border-purple-100">{t[0]}</span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck size={12} className="text-emerald-500" /> Criterios Críticos (ARIS)
                </p>
                <div className="p-4 bg-white border border-slate-100 rounded-2xl text-[11px] text-slate-500 leading-relaxed italic shadow-inner">
                  {/* Aquí mostramos los filtros que pusimos en el JSON del SQL */}
                  • Botas de casquillo: {v.requisitos_criticos?.botas ? 'SÍ' : 'NO'} <br/>
                  • Documentos originales: {v.requisitos_criticos?.documentos ? 'SÍ' : 'NO'}
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Activo</span>
              </div>
              <button className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-tighter hover:underline">
                Configurar <Settings2 size={14} />
              </button>
            </div>
          </div>
        ))}

        <div className="border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-10 hover:border-blue-200 transition-all group cursor-pointer min-h-[400px]">
           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
             <Plus className="text-slate-300 group-hover:text-blue-500" size={32} />
           </div>
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-blue-500">Añadir Nueva Operación</p>
        </div>

      </div>
    </div>
  )
}