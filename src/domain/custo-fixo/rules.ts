import type { Competencia } from '../../shared/data'
import type { Lancamento } from '../lancamento/model'
import { ativaNaCompetencia } from '../receita/rules'
import type { CustoFixo } from './model'

export { ativaNaCompetencia as ativoNaCompetencia }

/**
 * Um custo fixo é considerado pago no mês se existe uma despesa paga na mesma
 * competência, na mesma categoria e com o mesmo valor. Cada lançamento confirma
 * no máximo um custo.
 */
export function situacaoDosCustos(custos: CustoFixo[], lancamentos: Lancamento[], c: Competencia) {
  const usados = new Set<number>()
  return custos
    .filter((cf) => ativaNaCompetencia(cf, c))
    .map((cf) => {
      const l = lancamentos.find(
        (l) =>
          !usados.has(l.id) && l.tipo === 'DESPESA' && l.status === 'PAGO' && l.data.startsWith(c) &&
          l.valor === cf.valor && l.categoria_id === cf.categoria_id,
      )
      if (l) usados.add(l.id)
      return { custo: cf, pago: !!l, lancamento_id: l?.id ?? null }
    })
}
