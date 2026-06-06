"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Filter, Download, MessageCircle, ExternalLink, Cpu, X } from 'lucide-react'

const CAMPOS = ['nombre_completo','edad','zona_vivienda','turno_preferido','estado_civil','dependientes_economicos','tiempo_traslado_minutos','inconveniente_traslado','escolaridad_comprobable','experiencia_almacen_meses','areas_desempenadas','motivo_salida_anterior','tiene_constancias_laborales','nivel_salud_percecion','enfermedades_cronicas','lesiones_o_cirugias','alergias','esta_embarazada','problemas_respiratorios','sufre_vertigo','usa_lentes','credito_infonavit_fonacot','procesos_legales_antecedentes','documentacion_completa_original','tiene_botas_casquillo','tipo_calzado_actual','referidos_familiares_nombres','es_reingreso','cuenta_banco_santander_problemas']

const progreso = (p: any) => Math.round((CAMPOS.filter(c => p[c] !== null && p[c] !== undefined).length / CAMPOS.length) * 100)

const ultimoMensaje = (historial: any) => {
  try {
    const arr = JSON.parse(historial || '[]')
    const ultimo = [...arr].reverse().find((m: any) => m.role === 'user')
    return ultimo?.content?.slice(0, 80) || 'Sin mensajes aún...'
  } catch { return 'Sin mensajes aún...' }
}

const COLORES: Record<string, string> = {
  'Nuevo': 'bg-blue-100 text-blue-700',
  'Pendiente': 'bg-amber-100 text-amber-700',
  'Candidato Óptimo': 'bg-emerald-100 text-emerald-700',
  'Rechazado': 'bg-rose-100 text-rose-700',
}

const POR_PAGINA = 10

export default function ChatsPage() {
  const [conversaciones, setConversaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstatus, setFiltroEstatus] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)
  const [pagina, setPagina] = useState(1)
  const [candidatoModal, setCandidatoModal] = useState<any>(null)

  useEffect(() => {
    supabase.from('candidatos_respuestas').select('*').order('fecha_registro', { ascending: false })
      .then(({ data }) => { setConversaciones(data || []); setLoading(false) })
  }, [])

  const filtrados = conversaciones.filter(c => {
    const q = busqueda.toLowerCase()
    const okBusqueda = !busqueda || (c.nombre_completo || '').toLowerCase().includes(q) || (c.telefono_whatsapp || '').includes(q)
    const okEstatus = !filtroEstatus || c.estatus === filtroEstatus
    return okBusqueda && okEstatus
  })

  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA)
  const paginados = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  const exportarCSV = () => {
    const headers = ['Nombre','Teléfono','Estatus','CEDIS','Turno','Edad','Zona','Avance','Fecha']
    const rows = filtrados.map(c => [
      c.nombre_completo || '', c.telefono_whatsapp || '', c.estatus || '',
      c.vacante_cedis || '', c.turno_preferido || '', c.edad || '',
      c.zona_vivienda || '', `${progreso(c)}%`,
      new Date(c.fecha_registro).toLocaleDateString('es-MX')
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chats-aris-${new Date().toLocaleDateString('es-MX').replace(/\//g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const historialParsed = (historial: any) => {
    try { return JSON.parse(historial || '[]') } catch { return [] }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">

      {/* MODAL HISTORIAL */}
      {candidatoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
            
            {/* Header modal */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <div>
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Conversación ARIS</p>
                <h3 className="font-black text-slate-800 text-lg uppercase">{candidatoModal.nombre_completo || 'Candidato'}</h3>
                <p className="text-[10px] text-slate-400 font-bold">{candidatoModal.telefono_whatsapp}</p>
              </div>
              <button onClick={() => setCandidatoModal(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X size={20} className="text-slate-400"/>
              </button>
            </div>

            {/* Chat bubbles */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {historialParsed(candidatoModal.historial).length === 0 && (
                <p className="text-center text-slate-300 italic text-sm py-10">Sin mensajes registrados</p>
              )}
              {historialParsed(candidatoModal.historial).map((msg: any, i: number) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-700 rounded-bl-sm'
                  }`}>
                    {msg.role === 'assistant' && (
                      <p className="text-[8px] font-black text-blue-500 uppercase mb-1">ARIS</p>
                    )}
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer modal */}
            <div className="px-8 py-4 border-t border-slate-100 flex justify-between items-center">
              <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${COLORES[candidatoModal.estatus] || 'bg-slate-100 text-slate-500'}`}>
                {candidatoModal.estatus || 'Nuevo'}
              </span>
              <button onClick={() => window.open(`https://wa.me/${candidatoModal.telefono_whatsapp}`, '_blank')}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-all">
                <ExternalLink size={14}/> Abrir en WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Centro de Mensajes</h1>
          <p className="text-sm text-slate-400 font-medium">Monitorea la actividad de ARIS en tiempo real vía WhatsApp</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportarCSV} className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-2xl font-bold text-xs hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16}/> Exportar Excel
          </button>
          <button onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl font-bold text-xs shadow-lg transition-all ${mostrarFiltros ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
            <Filter size={16}/> Filtrar por Tipo
          </button>
        </div>
      </div>

      {mostrarFiltros && (
        <div className="flex gap-2 flex-wrap">
          {['', 'Nuevo', 'Pendiente', 'Candidato Óptimo', 'Rechazado'].map(e => (
            <button key={e} onClick={() => { setFiltroEstatus(e); setPagina(1) }}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border ${filtroEstatus === e ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'}`}>
              {e || 'Todos'}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-5 top-4 text-slate-300" size={20}/>
          <input type="text" placeholder="Buscar por nombre o número de teléfono..."
            value={busqueda} onChange={e => { setBusqueda(e.target.value); setPagina(1) }}
            className="w-full bg-white border border-slate-100 rounded-[2rem] py-4 pl-14 pr-6 text-sm shadow-xl shadow-slate-100/50 outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"/>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-[2rem] px-6 py-4 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
            Total Conversaciones<br/>
            <span className="text-blue-600 text-lg font-black">{filtrados.length} Registradas</span>
          </p>
          <Cpu className="text-blue-200" size={32}/>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-2xl shadow-slate-100/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-50">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Candidato</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Estatus</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Último Mensaje</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha Registro</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Avance</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && <tr><td colSpan={6} className="p-20 text-center text-slate-300 italic font-bold">Cargando...</td></tr>}
              {!loading && paginados.length === 0 && <tr><td colSpan={6} className="p-20 text-center text-slate-300 italic font-bold">Sin resultados</td></tr>}
              {paginados.map(item => {
                const avance = progreso(item)
                return (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-slate-800 text-sm uppercase">{item.nombre_completo || 'Candidato Nuevo'}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{item.telefono_whatsapp}</p>
                      {item.vacante_cedis && <p className="text-[9px] text-blue-500 font-bold mt-0.5">{item.vacante_cedis}</p>}
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${COLORES[item.estatus] || 'bg-slate-100 text-slate-500'}`}>
                        {item.estatus || 'Nuevo'}
                      </span>
                    </td>
                    <td className="px-8 py-6 max-w-xs">
                      <p className="text-xs text-slate-500 italic truncate">"{ultimoMensaje(item.historial)}"</p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-[10px] font-bold text-slate-700">{new Date(item.fecha_registro).toLocaleDateString('es-MX')}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${avance === 100 ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>{avance}%</span>
                        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${avance === 100 ? 'bg-emerald-500' : 'bg-blue-400'}`} style={{width: `${avance}%`}}/>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setCandidatoModal(item)}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all" title="Ver conversación">
                          <MessageCircle size={18}/>
                        </button>
                        <button onClick={() => window.open(`https://wa.me/${item.telefono_whatsapp}`, '_blank')}
                          className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-200 transition-all" title="Abrir en WhatsApp">
                          <ExternalLink size={18}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
            Página {pagina} de {totalPaginas || 1} · {filtrados.length} candidatos
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-400 disabled:opacity-40">Anterior</button>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina >= totalPaginas}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-blue-600 hover:bg-blue-600 hover:text-white transition-all disabled:opacity-40">Siguiente</button>
          </div>
        </div>
      </div>
    </div>
  )
}