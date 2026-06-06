"use client"
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MapPin, Clock, ShieldCheck, Plus, Settings2, Trash2, Edit3, X, Check } from 'lucide-react'

const TURNOS_OPCIONES = ['Matutino', 'Vespertino', 'Nocturno']

const defaultForm = {
  cedis: '', giro: '', puesto: 'Auxiliar de Almacén', ubicacion: '',
  turnos: [] as string[],
  requisitos_criticos: { botas: true, documentos: true }
}

export default function PerfilesPage() {
  const [vacantes, setVacantes] = useState<any[]>([])
  const [modal, setModal] = useState<'crear' | 'editar' | 'eliminar' | null>(null)
  const [form, setForm] = useState(defaultForm)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = async () => {
    const { data } = await supabase.from('vacantes').select('*').order('cedis')
    setVacantes(data || [])
  }

  useEffect(() => { cargar() }, [])

  const abrirEditar = (v: any) => {
    setForm({
      cedis: v.cedis, giro: v.giro, puesto: v.puesto,
      ubicacion: v.ubicacion, turnos: v.turnos || [],
      requisitos_criticos: v.requisitos_criticos || { botas: true, documentos: true }
    })
    setEditandoId(v.id)
    setModal('editar')
  }

  const abrirEliminar = (v: any) => {
    setEditandoId(v.id)
    setModal('eliminar')
  }

  const guardar = async () => {
    setGuardando(true)
    if (modal === 'crear') {
      await supabase.from('vacantes').insert(form)
    } else {
      await supabase.from('vacantes').update(form).eq('id', editandoId)
    }
    await cargar()
    setModal(null)
    setForm(defaultForm)
    setGuardando(false)
  }

  const eliminar = async () => {
    await supabase.from('vacantes').delete().eq('id', editandoId)
    await cargar()
    setModal(null)
  }

  const toggleTurno = (t: string) => {
    setForm(f => ({
      ...f,
      turnos: f.turnos.includes(t) ? f.turnos.filter(x => x !== t) : [...f.turnos, t]
    }))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">

      {/* MODAL CREAR / EDITAR */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-lg">{modal === 'crear' ? 'Nuevo Perfil' : 'Editar Perfil'}</h3>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} className="text-slate-400"/></button>
            </div>
            <div className="px-8 py-6 space-y-4">
              {[
                { label: 'Nombre del CEDIS', key: 'cedis', placeholder: 'ej. UPS 1' },
                { label: 'Giro', key: 'giro', placeholder: 'ej. Logística' },
                { label: 'Puesto', key: 'puesto', placeholder: 'ej. Auxiliar de Almacén' },
                { label: 'Ubicación', key: 'ubicacion', placeholder: 'ej. Cuautitlán Izcalli, EdoMex' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"/>
                </div>
              ))}

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turnos</label>
                <div className="flex gap-2 mt-2">
                  {TURNOS_OPCIONES.map(t => (
                    <button key={t} onClick={() => toggleTurno(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${form.turnos.includes(t) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                      {t[0]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Criterios Críticos</label>
                <div className="flex gap-3 mt-2">
                  {[
                    { key: 'botas', label: 'Botas casquillo' },
                    { key: 'documentos', label: 'Docs originales' },
                  ].map(({ key, label }) => (
                    <button key={key} onClick={() => setForm(f => ({ ...f, requisitos_criticos: { ...f.requisitos_criticos, [key]: !(f.requisitos_criticos as any)[key] } }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all border ${(form.requisitos_criticos as any)[key] ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {(form.requisitos_criticos as any)[key] ? <Check size={12}/> : <X size={12}/>} {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="px-6 py-2.5 rounded-2xl border border-slate-200 text-slate-500 text-xs font-black hover:bg-slate-50">Cancelar</button>
              <button onClick={guardar} disabled={guardando}
                className="px-6 py-2.5 rounded-2xl bg-blue-600 text-white text-xs font-black hover:bg-blue-700 disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ELIMINAR */}
      {modal === 'eliminar' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-sm p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
              <Trash2 size={28} className="text-rose-500"/>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-lg">¿Eliminar perfil?</h3>
              <p className="text-sm text-slate-400 mt-1">Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setModal(null)} className="px-6 py-2.5 rounded-2xl border border-slate-200 text-slate-500 text-xs font-black">Cancelar</button>
              <button onClick={eliminar} className="px-6 py-2.5 rounded-2xl bg-rose-500 text-white text-xs font-black hover:bg-rose-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight italic uppercase">Configuración de Perfiles</h1>
          <p className="text-sm text-slate-400 font-medium">Define los requisitos que ARIS debe validar en cada CEDIS</p>
        </div>
        <button onClick={() => { setForm(defaultForm); setModal('crear') }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-xl shadow-blue-100 transition-all">
          <Plus size={18}/> Crear Nuevo Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vacantes?.map((v: any) => (
          <div key={v.id} className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-100/50 overflow-hidden flex flex-col group hover:border-blue-500 transition-all">

            <div className="p-8 pb-6 border-b border-slate-50">
              <div className="flex justify-between items-start mb-4">
                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100">{v.giro}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirEditar(v)} className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:text-blue-600 transition-colors"><Edit3 size={14}/></button>
                  <button onClick={() => abrirEliminar(v)} className="p-2 bg-rose-50 text-rose-400 rounded-lg hover:text-rose-600 transition-colors"><Trash2 size={14}/></button>
                </div>
              </div>
              <h3 className="text-2xl font-black text-slate-800 leading-tight uppercase italic">{v.cedis}</h3>
              <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-tighter">{v.puesto}</p>
            </div>

            <div className="p-8 space-y-6 flex-1 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                    <MapPin size={14}/>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Ubicación</p>
                    <p className="text-[10px] font-bold text-slate-700">{v.ubicacion}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                    <Clock size={14}/>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Turnos</p>
                    <div className="flex flex-wrap gap-1">
                      {v.turnos?.map((t: string) => (
                        <span key={t} className="bg-purple-50 text-purple-600 text-[7px] px-1.5 py-0.5 rounded font-black uppercase border border-purple-100">{t[0]}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <ShieldCheck size={12} className="text-emerald-500"/> Criterios Críticos
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border ${v.requisitos_criticos?.botas ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                    {v.requisitos_criticos?.botas ? <Check size={10}/> : <X size={10}/>} Botas casquillo
                  </span>
                  <span className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border ${v.requisitos_criticos?.documentos ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'}`}>
                    {v.requisitos_criticos?.documentos ? <Check size={10}/> : <X size={10}/>} Docs originales
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border bg-rose-50 text-rose-600 border-rose-100">
                    <X size={10}/> Sin antecedentes
                  </span>
                  <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border bg-rose-50 text-rose-600 border-rose-100">
                    <X size={10}/> Sin vértigo
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Activo</span>
              </div>
              <button onClick={() => abrirEditar(v)} className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-tighter hover:underline">
                Configurar <Settings2 size={14}/>
              </button>
            </div>
          </div>
        ))}

        <div onClick={() => { setForm(defaultForm); setModal('crear') }}
          className="border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center p-10 hover:border-blue-200 transition-all group cursor-pointer min-h-[400px]">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Plus className="text-slate-300 group-hover:text-blue-500" size={32}/>
          </div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-blue-500">Añadir Nueva Operación</p>
        </div>
      </div>
    </div>
  )
}