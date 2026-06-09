import { supabase } from './lib/supabase'
import { Users, MessageCircle, TrendingUp, BarChart3, Plus, MapPin } from 'lucide-react'
import Link from 'next/link'
import MonthSelector from './components/MonthSelector'
import AutoRefresh from './components/AutoRefresh'

export const dynamic = 'force-dynamic'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default async function Home({ searchParams }: { searchParams: { mes?: string } }) {
  const now = new Date()
  const mesActual = MESES[now.getMonth()]
  const mes = searchParams?.mes || mesActual
  const mesIndex = MESES.indexOf(mes)
  const year = now.getFullYear()

  const desde = new Date(year, mesIndex, 1).toISOString()
  const hasta = new Date(year, mesIndex + 1, 0, 23, 59, 59).toISOString()
  const mesAntIndex = mesIndex === 0 ? 11 : mesIndex - 1
  const mesAntYear = mesIndex === 0 ? year - 1 : year
  const desdeAnt = new Date(mesAntYear, mesAntIndex, 1).toISOString()
  const hastaAnt = new Date(mesAntYear, mesAntIndex + 1, 0, 23, 59, 59).toISOString()
  const hace7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: vacantes },
    { count: totalContactos },
    { count: contactosMes },
    { count: contactosAnt },
    { data: todos },
    { data: ultimos },
    { data: recientes7 },
    { data: todoAnio },
  ] = await Promise.all([
    supabase.from('vacantes').select('*').order('cedis'),
    supabase.from('candidatos_respuestas').select('*', { count: 'exact', head: true }),
    supabase.from('candidatos_respuestas').select('*', { count: 'exact', head: true }).gte('fecha_registro', desde).lte('fecha_registro', hasta),
    supabase.from('candidatos_respuestas').select('*', { count: 'exact', head: true }).gte('fecha_registro', desdeAnt).lte('fecha_registro', hastaAnt),
    supabase.from('candidatos_respuestas').select('historial, telefono_whatsapp, nombre_completo, fecha_registro'),
    supabase.from('candidatos_respuestas').select('*').order('fecha_registro', { ascending: false }).limit(5),
    supabase.from('candidatos_respuestas').select('fecha_registro').gte('fecha_registro', hace7),
    supabase.from('candidatos_respuestas').select('fecha_registro').gte('fecha_registro', `${year}-01-01`),
  ])

  const parseMsgs = (h: any) => { try { return JSON.parse(h || '[]').length } catch { return 0 } }
  const totalMensajes = todos?.reduce((a, c) => a + parseMsgs(c.historial), 0) || 0
  const mensajesMes = (todos || []).filter(c => c.fecha_registro >= desde && c.fecha_registro <= hasta).reduce((a, c) => a + parseMsgs(c.historial), 0)
  const mensajesAnt = (todos || []).filter(c => c.fecha_registro >= desdeAnt && c.fecha_registro <= hastaAnt).reduce((a, c) => a + parseMsgs(c.historial), 0)
  const promedio = (contactosMes || 0) > 0 ? Math.round(mensajesMes / (contactosMes || 1)) : 0
  const promedioAnt = (contactosAnt || 0) > 0 ? Math.round(mensajesAnt / (contactosAnt || 1)) : 0

  const topCandidatos = (todos || [])
    .map(c => ({ nombre: c.nombre_completo || c.telefono_whatsapp, msgs: parseMsgs(c.historial) }))
    .sort((a, b) => b.msgs - a.msgs).slice(0, 5)

  const pct = (curr: number, prev: number) => {
    if (prev === 0 && curr === 0) return { label: '— sin datos previos', up: true }
    if (prev === 0) return { label: '↑ +100% vs mes anterior', up: true }
    const d = Math.round(((curr - prev) / prev) * 100)
    return { label: `${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}% vs mes anterior`, up: d >= 0 }
  }

  const diasMap: Record<string, number> = {}
  const diasLabels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    diasMap[key] = 0
    diasLabels.push(d.toLocaleDateString('es-MX', { weekday: 'short' }))
  }
  recientes7?.forEach(c => { const k = c.fecha_registro?.split('T')[0]; if (k && k in diasMap) diasMap[k]++ })
  const chartBars = Object.values(diasMap)
  const maxBar = Math.max(...chartBars, 1)

  const porMes = Array(12).fill(0)
  todoAnio?.forEach(c => { const m = new Date(c.fecha_registro).getMonth(); porMes[m]++ })
  const mesesHastaHoy = porMes.slice(0, now.getMonth() + 1)
  const maxAnio = Math.max(...mesesHastaHoy, 1)

  return (
    <div className="max-w-7xl mx-auto space-y-12 bg-white pb-20">
      <AutoRefresh intervalo={120000} />

      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Estadísticas de ARIS</h1>
          <div className="flex items-center gap-3">
            <MonthSelector seleccionado={mes}/>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rio Logística 2026</p>
          </div>
        </div>
        <Link href="/perfiles" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-100 transition-all">
          <Plus size={18}/> Nueva Vacante
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <StatCard title="Total Contactos" value={totalContactos || 0} icon={<Users size={20}/>} color="border-blue-500" iconColor="text-blue-600" compare={pct(contactosMes||0, contactosAnt||0)}/>
        <StatCard title="Mensajes este mes" value={mensajesMes} icon={<MessageCircle size={20}/>} color="border-purple-500" iconColor="text-purple-600" compare={pct(mensajesMes, mensajesAnt)}/>
        <StatCard title="Promedio por Contacto" value={promedio} icon={<TrendingUp size={20}/>} color="border-emerald-500" iconColor="text-emerald-600" compare={pct(promedio, promedioAnt)}/>
        <StatCard title="Contactos este mes" value={contactosMes || 0} icon={<BarChart3 size={20}/>} color="border-orange-500" iconColor="text-orange-600" compare={pct(contactosMes||0, contactosAnt||0)}/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Box title="Actividad de Usuarios" sub="Candidatos registrados — últimos 7 días">
          <div className="h-56 flex items-end justify-between px-2 border-b border-slate-100 gap-1 pb-1">
            {chartBars.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] text-slate-400">{v > 0 ? v : ''}</span>
                <div className={`w-full rounded-t-xl ${v > 0 ? 'bg-blue-600' : 'bg-blue-100'}`} style={{height: `${Math.max((v/maxBar)*100, 4)}%`}}/>
                <span className="text-[8px] text-slate-400 capitalize">{diasLabels[i]}</span>
              </div>
            ))}
          </div>
        </Box>
        <Box title="Candidatos por Mes" sub={`Actividad mensual — ${year}`}>
          <div className="h-56 flex items-end justify-between px-2 border-b border-slate-100 gap-1 pb-1">
            {mesesHastaHoy.map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[8px] text-slate-400">{v > 0 ? v : ''}</span>
                <div className={`w-full rounded-t-xl ${i === mesIndex ? 'bg-emerald-600' : 'bg-emerald-200'}`} style={{height: `${Math.max((v/maxAnio)*100, 4)}%`}}/>
                <span className="text-[8px] text-slate-400 capitalize">{MESES[i].slice(0,3)}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

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
                  {!ultimos?.length && (
                    <tr><td colSpan={4} className="p-10 text-center italic text-slate-300">Esperando candidatos en WhatsApp...</td></tr>
                  )}
                  {ultimos?.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-bold text-slate-800">{c.nombre_completo || 'Candidato Nuevo'}</td>
                      <td className="p-4 text-xs text-center italic">{c.estatus}</td>
                      <td className="p-4 text-[10px] font-bold">{new Date(c.fecha_registro).toLocaleDateString('es-MX')}</td>
                      <td className="p-4"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black">{c.calificacion_ia || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Box>
        </div>
        <Box title="Mensajes por Contacto" sub="Ranking de interacción">
          <div className="mt-4 space-y-4">
            {!topCandidatos.length && <p className="text-slate-300 text-sm italic text-center py-8">Sin datos aún</p>}
            {topCandidatos.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 w-4">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{c.nombre}</p>
                  <div className="h-1.5 bg-blue-50 rounded-full mt-1 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{width: `${Math.min(100,(c.msgs/(topCandidatos[0]?.msgs||1))*100)}%`}}/>
                  </div>
                </div>
                <span className="text-xs font-black text-blue-600">{c.msgs}</span>
              </div>
            ))}
          </div>
        </Box>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
          <span className="w-2 h-8 bg-blue-600 rounded-full"/> Monitor de CEDIS Activos
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
              <p className="text-xs text-slate-400 italic leading-relaxed border-t border-slate-50 pt-3">Filtros de botas y documentación activos.</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({ title, value, icon, color, iconColor, compare }: any) {
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] border-t-4 ${color} shadow-lg shadow-slate-100 flex flex-col justify-between h-56 hover:-translate-y-1 transition-all`}>
      <div className="flex justify-between items-start text-slate-300">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] w-24 leading-relaxed">{title}</p>
        <div className={`p-4 bg-slate-50 rounded-2xl ${iconColor}`}>{icon}</div>
      </div>
      <div>
        <h3 className="text-4xl font-black text-slate-800">{value}</h3>
        {compare && <p className={`text-[10px] font-bold mt-2 italic tracking-tighter ${compare.up ? 'text-emerald-500' : 'text-rose-500'}`}>{compare.label}</p>}
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