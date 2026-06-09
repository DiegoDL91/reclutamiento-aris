'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AutoRefresh({ intervalo = 120000 }: { intervalo?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalo)
    return () => clearInterval(id)
  }, [])
  return null
}