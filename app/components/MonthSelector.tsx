'use client'
import { useRouter, usePathname } from 'next/navigation'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function MonthSelector({ seleccionado }: { seleccionado: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const actual = MESES[new Date().getMonth()]

  return (
    <select
      value={seleccionado}
      onChange={e => router.push(`${pathname}?mes=${e.target.value}`)}
      className="text-sm text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 capitalize cursor-pointer"
    >
      {MESES.map(m => (
        <option key={m} value={m}>
          {m} {new Date().getFullYear()}{m === actual ? ' (actual)' : ''}
        </option>
      ))}
    </select>
  )
}