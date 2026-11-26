import { useState } from 'react'

/** Estado de formulário simples: valores em texto, erros por campo. */
export function useForm<T extends object>(inicial: T) {
  const [valores, setValores] = useState<T>(inicial)
  const [erros, setErros] = useState<Partial<Record<keyof T, string>>>({})
  const campo = (k: keyof T) => ({
    value: String(valores[k] ?? ''),
    onChange: (e: { target: { value: string } }) => setValores((v) => ({ ...v, [k]: e.target.value })),
  })
  const marcar = (k: keyof T) => ({
    checked: Boolean(valores[k]),
    onChange: (e: { target: { checked: boolean } }) => setValores((v) => ({ ...v, [k]: e.target.checked })),
  })
  const reiniciar = (novo: T) => { setValores(novo); setErros({}) }
  return { valores, setValores, erros, setErros, campo, marcar, reiniciar }
}
