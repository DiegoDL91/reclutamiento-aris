'use client'
import { useRouter, usePathname } from 'next/navigation'
import { Calendar } from 'lucide-react'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function MonthSelector({ seleccionado }: { seleccionado: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const actual = MESES[new Date().getMonth()]

  return (
    <div className="relative inline-flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
      <Calendar size={14} className="text-blue-500 shrink-0"/>
      <select
        value={seleccionado}
        onChange={e => router.push(`${pathname}?mes=${e.target.value}`)}
        className="text-sm font-black text-slate-700 uppercase bg-transparent border-none outline-none cursor-pointer pr-2"
      >
        {MESES.map(m => (
          <option key={m} value={m}>
            {m.toUpperCase()}{m === actual ? ' ✓' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}