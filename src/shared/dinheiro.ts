/** Todo valor monetário do app é um inteiro em centavos. */
export type Centavos = number

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const compacto = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

const decimal = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Centavos → "1.234,56" (texto de formulário, sem o R$). */
export const centavosParaTexto = (c: Centavos | null | undefined) => (c == null ? '' : decimal.format(c / 100))
/** Número em % → "1,99" (texto de formulário). */
export const pctParaTexto = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? '' : String(Math.round(v * 10000) / 10000).replace('.', ','))
/** "1,99" ou "1.99" → 1.99; vazio → null; inválido → NaN. */
export function textoParaNumero(t: string): number | null {
  const v = t.trim().replace('%', '').trim()
  if (!v) return null
  return Number(v.includes(',') ? v.replace(/\./g, '').replace(',', '.') : v)
}

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
