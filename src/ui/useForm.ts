import { useState } from 'react'

/** Estado de formulário simples: valores em texto, erros por campo. */
export function useForm<T extends object>(inicial: T) {
  const [valores, setValores] = useState<T>(inicial)
  const [erros, setErros] = useState<Partial<Record<keyof T, string>>>({})
  const campo = (k: keyof T) => ({
    value: String(valores[k] ?? ''),
    onChange: (valor: string) => setValores((v) => ({ ...v, [k]: valor })),
  })
  const marcar = (k: keyof T) => ({
    checked: Boolean(valores[k]),
    onChange: (marcado: boolean) => setValores((v) => ({ ...v, [k]: marcado })),
  })
  const reiniciar = (novo: T) => { setValores(novo); setErros({}) }
  return { valores, setValores, erros, setErros, campo, marcar, reiniciar }
}
