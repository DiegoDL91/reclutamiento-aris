import { supabase } from './lib/supabase' 
import { Users, MessageCircle, TrendingUp, BarChart3, Plus, MapPin } from 'lucide-react'

export default async function Home() {
  // 1. Traemos las vacantes (UPS 1, UPS 2, Penguin)
  const { data: vacantes } = await supabase.from('vacantes').select('*').order('cedis', { ascending: true })

  // 2. Traemos el conteo real de prospectos
  const { count: totalContactos } = await supabase.from('candidatos_respuestas').select('*', { count: 'exact', head: true })

  // 3. Traemos los últimos 2 mensajes reales (si es que hay)
  const { data: ultimosCandidatos } = await supabase.from('candidatos_respuestas').select('*').order('fecha_registro', { ascending: false }).limit(2)

  return (
    <div className="max-w-7xl mx-auto space-y-12 bg-white pb-20">
      
      {/* HEADER DE ESTADÍSTICAS */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Estadísticas de ARIS</h1>
          <p className="text-sm text-slate-400 font-medium">marzo 2026 | Centro de Mando Rio Logística</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all">
          <Plus size={18} /> Nueva Vacante
        </button>
      </div>

      {/* 4 TARJETAS PRINCIPALES (Conectadas a la base) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Total Contactos" value={totalContactos || 0} icon={<Users size={20}/>} color="border-blue-500" iconColor="text-blue-600" />
        <StatCard title="Total Mensajes" value="0" icon={<MessageCircle size={20}/>} color="border-purple-500" iconColor="text-purple-600" />
        <StatCard title="Promedio Canal" value="0" icon={<TrendingUp size={20}/>} color="border-emerald-500" iconColor="text-emerald-600" />
        <StatCard title="Recibidos" value="0" icon={<BarChart3 size={20}/>} color="border-orange-500" iconColor="text-orange-600" />
      </div>

      {/* GRÁFICAS DE ACTIVIDAD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Box title="Actividad de Usuarios" sub="Flujo de ARIS vs Registros">
          <div className="h-56 flex items-end justify-between px-4 border-b border-slate-100 gap-2 pb-1">
             {[30, 60, 40, 95, 55, 70, 85].map((h, i) => (
               <div key={i} className={`w-full ${i === 3 ? 'bg-blue-600' : 'bg-blue-100'} rounded-t-xl transition-all`} style={{height: `${h}%`}}></div>
             ))}
          </div>
        </Box>
        <Box title="Tráfico por Día" sub="Visitantes únicos diarios">
          <div className="h-56 flex items-end justify-center gap-16 pb-4">
            <div className="w-16 bg-emerald-400 rounded-2xl shadow-lg shadow-emerald-50" style={{height: '55%'}}></div>
            <div className="w-16 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200" style={{height: '95%'}}></div>
          </div>
        </Box>
      </div>

      {/* SECCIÓN DE MENSAJES (DINÁMICA) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <Box title="Mensajes Recibidos" sub="Últimas interacciones procesadas por ARIS">
            <div className="mt-6 overflow-hidden border border-slate-50 rounded-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="p-4">Nombre</th>
                    <th className="p-4 text-center">Estatus</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Calif.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {ultimosCandidatos?.length === 0 && (
                    <tr><td colSpan={4} className="p-10 text-center italic text-slate-300">Esperando candidatos en WhatsApp...</td></tr>
                  )}
                  {ultimosCandidatos?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{c.nombre_completo || 'Candidato Nuevo'}</td>
                      <td className="p-4 text-xs text-center italic">{c.estatus}</td>
                      <td className="p-4 text-[10px] font-bold">{new Date(c.fecha_registro).toLocaleDateString()}</td>
                      <td className="p-4"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{c.calificacion_ia || 0}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Box>
        </div>
        <Box title="Mensajes por Contacto" sub="Ranking de interacción">
          <div className="h-full flex flex-col justify-center space-y-8 py-10">
            <div className="w-full bg-blue-900 h-12 rounded-2xl shadow-lg flex items-center px-4 justify-between">
               <span className="text-[10px] text-white font-bold tracking-tighter italic">MONITOR ACTIVO</span>
               <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </Box>
      </div>

      {/* MONITOR DE CEDIS (DINÁMICO) */}
      <section className="space-y-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <span className="w-2 h-8 bg-blue-600 rounded-full"></span> Monitor de CEDIS Activos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {vacantes?.map((v: any) => (
            <div key={v.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:border-blue-200 transition-all">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em]">{v.giro}</span>
                <div className="flex gap-1">
                   {v.turnos?.map((t: string) => (
                     <span key={t} className="text-[7px] bg-slate-100 px-1 rounded uppercase font-bold">{t[0]}</span>
                   ))}
                </div>
              </div>
              <h3 className="text-xl font-black text-slate-800 mt-1 mb-1">{v.cedis}</h3>
              <p className="text-[10px] text-slate-400 mb-3 flex items-center gap-1"><MapPin size={10}/> {v.ubicacion}</p>
              <p className="text-xs text-slate-400 italic leading-relaxed border-t border-slate-50 pt-3">
                "Filtros de botas y documentación activos."
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

function StatCard({ title, value, icon, color, iconColor }: any) {
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] border-t-4 ${color} shadow-lg shadow-slate-100 flex flex-col justify-between h-56 hover:-translate-y-1 transition-all`}>
      <div className="flex justify-between items-start text-slate-300">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] w-24 leading-relaxed">{title}</p>
        <div className={`p-4 bg-slate-50 rounded-2xl ${iconColor}`}>{icon}</div>
      </div>
      <div>
        <h3 className="text-4xl font-black text-slate-800">{value}</h3>
        <p className="text-[10px] font-bold text-rose-500 mt-2 italic tracking-tighter">↘ -50.0% vs mes anterior</p>
      </div>
    </div>
  )
}

function Box({ title, sub, children }: any) {
  return (
    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{sub}</p>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}