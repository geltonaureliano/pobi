import type { Centavos } from '../../shared/dinheiro'
import { competenciaDe, type Competencia, type DataISO } from '../../shared/data'
import type { Lancamento, LancamentoDetalhado } from './model'

/** Só conta para totais o que é receita/despesa efetiva: nem transferência, nem cancelado, nem pagamento de fatura. */
export const contaParaTotais = (l: Pick<Lancamento, 'tipo' | 'status'> & { fatura_ref?: string | null }) =>
  l.tipo !== 'TRANSFERENCIA' && l.status !== 'CANCELADO' && !l.fatura_ref

/** Confirmado = já pago. Pendentes entram em projeções, não em realizados. */
export const confirmado = (l: Pick<Lancamento, 'tipo' | 'status'> & { fatura_ref?: string | null }) => contaParaTotais(l) && l.status === 'PAGO'

export interface Totais {
  receitas: Centavos
  despesas: Centavos
  resultado: Centavos
}

export function totaisDaCompetencia(lancamentos: Lancamento[], c: Competencia): Totais {
  let receitas = 0
  let despesas = 0
  for (const l of lancamentos) {
    if (!confirmado(l) || competenciaDe(l.data) !== c) continue
    if (l.tipo === 'RECEITA') receitas += l.valor
    else despesas += l.valor
  }
  return { receitas, despesas, resultado: receitas - despesas }
}

/** Despesa confirmada por dia, para o heatmap. Dias sem gasto não aparecem. */
export function despesaPorDia(lancamentos: Lancamento[]): Map<DataISO, Centavos> {
  const m = new Map<DataISO, Centavos>()
  for (const l of lancamentos) {
    if (l.tipo !== 'DESPESA' || !confirmado(l)) continue
    m.set(l.data, (m.get(l.data) ?? 0) + l.valor)
  }
  return m
}

export interface FatiaCategoria {
  categoria_id: number | null
  nome: string
  valor: Centavos
  participacao: number
}

/** Ranking de despesas confirmadas por categoria na competência, maior primeiro. */
export function despesaPorCategoria(lancamentos: LancamentoDetalhado[], c: Competencia): FatiaCategoria[] {
  const m = new Map<number | null, FatiaCategoria>()
  let total = 0
  for (const l of lancamentos) {
    if (l.tipo !== 'DESPESA' || !confirmado(l) || competenciaDe(l.data) !== c) continue
    const atual = m.get(l.categoria_id) ?? {
      categoria_id: l.categoria_id,
      nome: l.categoria_nome ?? 'Sem categoria',
      valor: 0,
      participacao: 0,
    }
    atual.valor += l.valor
    total += l.valor
    m.set(l.categoria_id, atual)
  }
  return [...m.values()]
    .map((f) => ({ ...f, participacao: total ? f.valor / total : 0 }))
    .sort((a, b) => b.valor - a.valor)
}

/** Efeito do lançamento no saldo de uma conta (centavos, com sinal). */
export function efeitoNaConta(l: Lancamento, contaId: number): Centavos {
  if (l.status !== 'PAGO' || l.cartao_id != null) return 0
  if (l.tipo === 'TRANSFERENCIA') {
    if (l.conta_id === contaId) return -l.valor
    if (l.conta_destino_id === contaId) return l.valor
    return 0
  }
  if (l.conta_id !== contaId) return 0
  return l.tipo === 'RECEITA' ? l.valor : -l.valor
}
