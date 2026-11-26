import { variacao, type Centavos } from '../../shared/dinheiro'
import { deslocarCompetencia, intervaloDeDias, type Competencia, type DataISO } from '../../shared/data'
import type { Lancamento } from '../lancamento/model'
import { despesaPorDia, totaisDaCompetencia } from '../lancamento/rules'

export interface Metrica {
  valor: Centavos | number
  variacao: number | null
}

export interface MetricasDoMes {
  receitas: Metrica
  despesas: Metrica
  /** Fração da receita que sobrou. null quando não houve receita. */
  taxaPoupanca: { valor: number | null; anterior: number | null }
}

const taxa = (r: Centavos, d: Centavos) => (r > 0 ? (r - d) / r : null)

export function metricasDoMes(lancamentos: Lancamento[], c: Competencia): MetricasDoMes {
  const atual = totaisDaCompetencia(lancamentos, c)
  const ant = totaisDaCompetencia(lancamentos, deslocarCompetencia(c, -1))
  return {
    receitas: { valor: atual.receitas, variacao: variacao(atual.receitas, ant.receitas) },
    despesas: { valor: atual.despesas, variacao: variacao(atual.despesas, ant.despesas) },
    taxaPoupanca: { valor: taxa(atual.receitas, atual.despesas), anterior: taxa(ant.receitas, ant.despesas) },
  }
}

export interface CelulaHeatmap {
  data: DataISO
  valor: Centavos
  /** 0 = sem gasto, 1..4 = quartis de intensidade */
  nivel: 0 | 1 | 2 | 3 | 4
}

/**
 * Heatmap de gastos: uma coluna por semana (começando no domingo), 7 linhas.
 * Níveis pela posição (percentil) entre os dias com gasto, para um dia caro não apagar o resto.
 */
export function heatmapDeGastos(lancamentos: Lancamento[], inicio: DataISO, fim: DataISO): CelulaHeatmap[][] {
  const porDia = despesaPorDia(lancamentos)
  const dias = intervaloDeDias(inicio, fim)
  const valores = dias.map((d) => porDia.get(d) ?? 0).filter((v) => v > 0).sort((a, b) => a - b)
  // Posição relativa do valor entre os dias com gasto: menor = 1, maior = 4.
  const nivel = (v: number): CelulaHeatmap['nivel'] => {
    if (v <= 0) return 0
    if (valores.length < 2) return 4
    const pos = valores.indexOf(v) / (valores.length - 1)
    return (1 + Math.round(pos * 3)) as CelulaHeatmap['nivel']
  }

  const colunas: CelulaHeatmap[][] = []
  const offset = new Date(`${inicio}T00:00:00Z`).getUTCDay()
  dias.forEach((d, i) => {
    const pos = i + offset
    const col = Math.floor(pos / 7)
    ;(colunas[col] ??= [])[pos % 7] = { data: d, valor: porDia.get(d) ?? 0, nivel: nivel(porDia.get(d) ?? 0) }
  })
  return colunas
}
