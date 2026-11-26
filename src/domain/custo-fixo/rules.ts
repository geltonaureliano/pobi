import { dataNoMes, diasNoMes, type Competencia } from '../../shared/data'
import type { Lancamento, NovoLancamento } from '../lancamento/model'
import { ativaNaCompetencia } from '../receita/rules'
import type { CustoFixo } from './model'

export { ativaNaCompetencia as ativoNaCompetencia }

export const idDoGerado = (custoId: number, c: Competencia) => `custo:${custoId}:${c}`

export type SituacaoCusto = 'pago' | 'pendente' | 'faltando'

/**
 * Situação de cada custo fixo ativo no mês:
 * - `pago`: há lançamento gerado por ele já pago, ou uma despesa paga na mesma
 *   competência, categoria e valor (lançada à mão). Cada lançamento confirma um custo só.
 * - `pendente`: o lançamento do mês foi gerado, mas ainda não foi pago.
 * - `faltando`: nada lançado ainda.
 */
export function situacaoDosCustos(custos: CustoFixo[], lancamentos: Lancamento[], c: Competencia) {
  const usados = new Set<number>()
  return custos
    .filter((cf) => ativaNaCompetencia(cf, c))
    .map((cf) => {
      let l = lancamentos.find((x) => x.id_externo === idDoGerado(cf.id, c) && x.status !== 'CANCELADO')
      if (!l) {
        l = lancamentos.find(
          (x) =>
            !usados.has(x.id) && x.id_externo == null && x.tipo === 'DESPESA' && x.status === 'PAGO' && x.data.startsWith(c) &&
            x.valor === cf.valor && x.categoria_id === cf.categoria_id,
        )
      }
      if (l) usados.add(l.id)
      const situacao: SituacaoCusto = !l ? 'faltando' : l.status === 'PAGO' ? 'pago' : 'pendente'
      return { custo: cf, situacao, pago: situacao === 'pago', lancamento_id: l?.id ?? null }
    })
}

/** Lançamentos pendentes a criar para os custos que ainda não têm nada no mês. */
export function lancamentosAGerar(custos: CustoFixo[], lancamentos: Lancamento[], c: Competencia): NovoLancamento[] {
  return situacaoDosCustos(custos, lancamentos, c)
    .filter((s) => s.situacao === 'faltando')
    .map(({ custo }) => ({
      descricao: custo.nome,
      valor: custo.valor,
      tipo: 'DESPESA',
      status: 'PENDENTE',
      data: dataNoMes(c, custo.dia_vencimento ?? diasNoMes(c)),
      conta_id: custo.cartao_id ? null : custo.conta_id,
      conta_destino_id: null,
      cartao_id: custo.cartao_id,
      categoria_id: custo.categoria_id,
      observacao: null,
      origem: 'RECORRENTE',
      id_externo: idDoGerado(custo.id, c),
    }))
}
