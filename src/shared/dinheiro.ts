/** Todo valor monetário do app é um inteiro em centavos. */
export type Centavos = number

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

export const formatarBRL = (c: Centavos) => brl.format(c / 100)
export const formatarCompacto = (c: Centavos) => `R$ ${compacto.format(c / 100)}`

/** Aceita "1.234,56", "1234.56", "-45,9", "R$ 10". Retorna null se não for número. */
export function paraCentavos(texto: string): Centavos | null {
  let t = texto.replace(/[R$\s]/g, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null
  return Math.round(Number(t) * 100)
}

/** Variação percentual de `anterior` para `atual`; null quando não há base. */
export function variacao(atual: Centavos, anterior: Centavos): number | null {
  if (anterior === 0) return null
  return (atual - anterior) / Math.abs(anterior)
}

export const formatarPct = (v: number, sinal = false) =>
  `${sinal && v > 0 ? '+' : ''}${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
