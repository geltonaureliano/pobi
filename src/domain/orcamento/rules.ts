import type { Competencia } from '../../shared/data'
import type { FatiaCategoria } from '../lancamento/rules'
import type { Orcamento, ProgressoOrcamento } from './model'

/** Cruza orçamentos da competência com o gasto confirmado de cada categoria. */
export function progressoDosOrcamentos(
  orcamentos: (Orcamento & { categoria_nome: string })[],
  gastos: FatiaCategoria[],
  c: Competencia,
): ProgressoOrcamento[] {
  return orcamentos
    .filter((o) => o.competencia === c)
    .map((o) => {
      const gasto = gastos.find((g) => g.categoria_id === o.categoria_id)?.valor ?? 0
      return {
        orcamento: o,
        gasto,
        usado: gasto / o.limite,
        restante: o.limite - gasto,
        estourado: gasto > o.limite,
      }
    })
    .sort((a, b) => b.usado - a.usado)
}

/** Ritmo: quanto do orçamento era esperado gastar até o dia `dia` de um mês com `dias` dias. */
export const ritmoEsperado = (dia: number, dias: number) => Math.min(1, dia / dias)
