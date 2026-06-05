"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, MoreHorizontal, Calendar } from 'lucide-react'

const CAMPOS = ['nombre_completo','edad','zona_vivienda','turno_preferido','estado_civil','dependientes_economicos','tiempo_traslado_minutos','inconveniente_traslado','escolaridad_comprobable','experiencia_almacen_meses','areas_desempenadas','motivo_salida_anterior','tiene_constancias_laborales','nivel_salud_percecion','enfermedades_cronicas','lesiones_o_cirugias','alergias','esta_embarazada','problemas_respiratorios','sufre_vertigo','usa_lentes','credito_infonavit_fonacot','procesos_legales_antecedentes','documentacion_completa_original','tiene_botas_casquillo','tipo_calzado_actual','referidos_familiares_nombres','es_reingreso','cuenta_banco_santander_problemas']

const progreso = (p: any) => CAMPOS.filter(c => p[c] !== null && p[c] !== undefined).length

export default function ProspectosPage() {
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const [mesSeleccionado, setMesSeleccionado] = useState(meses[new Date().getMonth()])
  const [prospectos, setProspectos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')

  const cargarProspectos = async () => {
    const año = new Date().getFullYear()
    const index = meses.indexOf(mesSeleccionado)
    const { data } = await supabase
      .from('candidatos_respuestas')
      .select('*')
      .gte('fecha_registro', new Date(año, index, 1).toISOString())
      .lte('fecha_registro', new Date(año, index + 1, 0, 23, 59, 59).toISOString())
      .order('fecha_registro', { ascending: false })
    setProspectos(data || [])
  }

  useEffect(() => { cargarProspectos() }, [mesSeleccionado])

  const filtrados = prospectos.filter(p => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (p.nombre_completo || '').toLowerCase().includes(q) || (p.telefono_whatsapp || '').includes(q)
  })

  const columnas = [
    { id: 'Nuevo', titulo: 'Nuevos', color: 'bg-blue-500' },
    { id: 'Pendiente', titulo: 'Pendientes', color: 'bg-amber-500' },
    { id: 'Candidato Óptimo', titulo: 'Candidato Óptimo', color: 'bg-emerald-500' },
    { id: 'Rechazado', titulo: 'Rechazados', color: 'bg-rose-500' },
  ]

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Prospectos</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-slate-800">
              <Calendar size={14} className="text-blue-600"/>
              <select value={mesSeleccionado} onChange={e => setMesSeleccionado(e.target.value)}
                className="text-xs font-black uppercase tracking-widest outline-none bg-transparent cursor-pointer">
                {meses.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">Rio Logística 2026</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-5 top-4 text-slate-300" size={20}/>
        <input type="text" placeholder="Buscar candidato por nombre o teléfono..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full bg-white border border-slate-100 rounded-[2rem] py-4 pl-14 pr-6 text-sm shadow-xl shadow-slate-100/50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-300"/>
      </div>

      <div className="flex gap-10 overflow-x-auto pb-10 min-h-[70vh]">
        {columnas.map(col => (
          <div key={col.id} className="flex-shrink-0 w-80 space-y-6">
            <div className="flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${col.color}`}/>
                <h3 className="font-black text-slate-700 text-xs uppercase tracking-[0.2em]">{col.titulo}</h3>
                <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black">
                  {filtrados.filter(p => p.estatus === col.id).length}
                </span>
              </div>
              <MoreHorizontal size={18} className="text-slate-300 cursor-pointer"/>
            </div>

            <div className="bg-slate-50/40 p-4 rounded-[2.5rem] border border-slate-100 min-h-[500px] space-y-5">
              {filtrados.filter(p => p.estatus === col.id).map((p: any) => {
                const avance = progreso(p)
                return (
                  <div key={p.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-50 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-tighter italic">ID: {p.id.slice(0,5)}</span>
                      {p.vacante_cedis && <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-2 py-1 rounded-full uppercase">{p.vacante_cedis}</span>}
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-600 transition-colors uppercase">{p.nombre_completo || 'Candidato Nuevo'}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mb-3 tracking-tight">{p.telefono_whatsapp}</p>

                    <div className="flex gap-1.5 flex-wrap mb-3">
                      {p.turno_preferido && <span className="text-[8px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold uppercase">{p.turno_preferido}</span>}
                      {p.edad && <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">{p.edad} años</span>}
                      {p.zona_vivienda && <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold truncate max-w-[100px]">{p.zona_vivienda}</span>}
                    </div>

                    <div className="pt-3 border-t border-slate-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Avance entrevista</span>
                        <span className="text-[8px] font-black text-blue-600">{avance}/{CAMPOS.length}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${avance === CAMPOS.length ? 'bg-emerald-500' : 'bg-blue-400'}`} style={{width: `${(avance/CAMPOS.length)*100}%`}}/>
                      </div>
                    </div>
                  </div>
                )
              })}

              {filtrados.filter(p => p.estatus === col.id).length === 0 && (
                <div className="h-40 flex flex-col items-center justify-center text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] text-center opacity-50 space-y-2">
                  <div className="w-8 h-8 border-2 border-dashed border-slate-200 rounded-full"/>
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