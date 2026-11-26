import { diasNoMes, pad, type Competencia, type DataISO } from './data'

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). */
function pascoa(ano: number): DataISO {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1
  return `${ano}-${pad(mes)}-${pad(dia)}`
}

const somarDias = (d: DataISO, n: number) => {
  const x = new Date(`${d}T00:00:00Z`); x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

/**
 * Feriados nacionais (lei federal). Carnaval e Corpus Christi são pontos facultativos e
 * feriados estaduais/municipais não entram: quem precisar ajusta os dias do mês na receita.
 */
export function feriadosNacionais(ano: number): { data: DataISO; nome: string }[] {
  const f = (md: string, nome: string) => ({ data: `${ano}-${md}`, nome })
  return [
    f('01-01', 'Confraternização Universal'),
    { data: somarDias(pascoa(ano), -2), nome: 'Sexta-feira Santa' },
    f('04-21', 'Tiradentes'),
    f('05-01', 'Dia do Trabalho'),
    f('09-07', 'Independência'),
    f('10-12', 'Nossa Senhora Aparecida'),
    f('11-02', 'Finados'),
    f('11-15', 'Proclamação da República'),
    ...(ano >= 2024 ? [f('11-20', 'Consciência Negra')] : []),
    f('12-25', 'Natal'),
  ].sort((a, b) => a.data.localeCompare(b.data))
}

/** Dias úteis do mês: segunda a sexta, sem feriados nacionais. */
export function diasUteis(c: Competencia): { dias: number; feriados: { data: DataISO; nome: string }[] } {
  const ano = Number(c.slice(0, 4))
  const feriados = feriadosNacionais(ano).filter((x) => x.data.startsWith(c))
  const datas = new Set(feriados.map((x) => x.data))
  let dias = 0
  const noDiaUtil: { data: DataISO; nome: string }[] = []
  for (let d = 1; d <= diasNoMes(c); d++) {
    const data = `${c}-${pad(d)}`
    const sem = new Date(`${data}T00:00:00Z`).getUTCDay()
    if (sem === 0 || sem === 6) continue
    if (datas.has(data)) { noDiaUtil.push(feriados.find((x) => x.data === data)!); continue }
    dias++
  }
  return { dias, feriados: noDiaUtil }
}
