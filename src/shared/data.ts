/** Datas são strings de calendário (YYYY-MM-DD), sem fuso. Competência é YYYY-MM. */
export type DataISO = string
export type Competencia = string

export const hoje = (): DataISO => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const pad = (n: number) => String(n).padStart(2, '0')
export const competenciaDe = (data: DataISO): Competencia => data.slice(0, 7)

export function deslocarCompetencia(c: Competencia, meses: number): Competencia {
  const [a, m] = c.split('-').map(Number)
  const total = a * 12 + (m - 1) + meses
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
}

export function diasNoMes(c: Competencia): number {
  const [a, m] = c.split('-').map(Number)
  return new Date(Date.UTC(a, m, 0)).getUTCDate()
}

/** Ajusta um dia (1-31) para o último dia válido do mês. */
export function dataNoMes(c: Competencia, dia: number): DataISO {
  return `${c}-${pad(Math.min(dia, diasNoMes(c)))}`
}

export function dataValida(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false
  const d = new Date(`${v}T00:00:00Z`)
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
export const rotuloMes = (c: Competencia) => MESES[Number(c.slice(5, 7)) - 1]
export const rotuloCompetencia = (c: Competencia) => `${rotuloMes(c)} ${c.slice(0, 4)}`

/** Lista de datas de `inicio` até `fim`, inclusive. */
export function intervaloDeDias(inicio: DataISO, fim: DataISO): DataISO[] {
  const out: DataISO[] = []
  const d = new Date(`${inicio}T00:00:00Z`)
  const f = new Date(`${fim}T00:00:00Z`)
  while (d <= f) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}
