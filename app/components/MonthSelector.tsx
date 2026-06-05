'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Calendar } from 'lucide-react'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function MonthSelector({ seleccionado }: { seleccionado: string }) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm text-slate-800">
      <Calendar size={14} className="text-blue-600"/>
      <select
        value={seleccionado}
        onChange={e => router.push(`${pathname}?mes=${e.target.value}`)}
        className="text-xs font-black uppercase tracking-widest outline-none bg-transparent cursor-pointer"
      >
        {MESES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}