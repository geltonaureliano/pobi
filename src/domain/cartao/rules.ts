import type { Centavos } from '../../shared/dinheiro'
import { dataNoMes, deslocarCompetencia, type Competencia, type DataISO } from '../../shared/data'
import type { Lancamento } from '../lancamento/model'
import type { Cartao } from './model'

/**
 * Fatura a que uma compra pertence, identificada pelo mês de VENCIMENTO.
 * Compra até o dia de fechamento (inclusive) entra na fatura que fecha naquele
 * mês; depois dele, na seguinte. Se o vencimento é antes do fechamento no
 * calendário (ex.: fecha 28, vence 5), a fatura vence no mês seguinte ao fechamento.
 */
export function faturaDaCompra(cartao: Pick<Cartao, 'dia_fechamento' | 'dia_vencimento'>, data: DataISO): Competencia {
  const c = data.slice(0, 7)
  const dia = Number(data.slice(8, 10))
  const fechamento = Number(dataNoMes(c, cartao.dia_fechamento).slice(8, 10))
  const mesFechamento = dia <= fechamento ? c : deslocarCompetencia(c, 1)
  return cartao.dia_vencimento <= cartao.dia_fechamento ? deslocarCompetencia(mesFechamento, 1) : mesFechamento
}

export const vencimentoDaFatura = (cartao: Pick<Cartao, 'dia_vencimento'>, fatura: Competencia): DataISO =>
  dataNoMes(fatura, cartao.dia_vencimento)

/** Total da fatura: despesas do cartão não canceladas cuja compra cai nela. */
export function totalDaFatura(cartao: Cartao, lancamentos: Lancamento[], fatura: Competencia): Centavos {
  return lancamentos
    
    .filter((l) => l.cartao_id === cartao.id && l.tipo === 'DESPESA' && l.status !== 'CANCELADO')
    .filter((l) => faturaDaCompra(cartao, l.data) === fatura)
    .reduce((s, l) => s + l.valor, 0)
}

export const limiteDisponivel = (cartao: Cartao, emAberto: Centavos) => cartao.limite - emAberto

export interface ResumoFatura {
  fatura: Competencia
  vencimento: DataISO
  total: Centavos
  pago: Centavos
  emAberto: Centavos
  situacao: 'aberta' | 'paga' | 'parcial' | 'vazia'
}

/**
 * Situação de uma fatura. O pagamento é um lançamento de despesa na conta
 * com `fatura_ref = <cartao_id>:<AAAA-MM>` (gerado pelo botão "Pagar fatura").
 */
export function resumoDaFatura(cartao: Cartao, lancamentos: Lancamento[], fatura: Competencia): ResumoFatura {
  const total = totalDaFatura(cartao, lancamentos, fatura)
  const marca = marcaDePagamento(cartao.id, fatura)
  const pago = lancamentos.filter((l) => l.fatura_ref === marca && l.status === 'PAGO').reduce((s, l) => s + l.valor, 0)
  const emAberto = Math.max(0, total - pago)
  return {
    fatura, vencimento: vencimentoDaFatura(cartao, fatura), total, pago, emAberto,
    situacao: total === 0 ? 'vazia' : emAberto === 0 ? 'paga' : pago > 0 ? 'parcial' : 'aberta',
  }
}

export const marcaDePagamento = (cartaoId: number, fatura: Competencia) => `${cartaoId}:${fatura}`

/** Faturas de `de` até `ate` (competências de vencimento), da mais recente para a mais antiga. */
export function faturasDoPeriodo(cartao: Cartao, lancamentos: Lancamento[], de: Competencia, ate: Competencia): ResumoFatura[] {
  const out: ResumoFatura[] = []
  for (let c = ate; c >= de; c = deslocarCompetencia(c, -1)) out.push(resumoDaFatura(cartao, lancamentos, c))
  return out
}

/** Compras ainda não pagas (todas as faturas em aberto), para o limite disponível. */
export function emAbertoNoCartao(cartao: Cartao, lancamentos: Lancamento[]): Centavos {
  const faturas = new Set(
    lancamentos.filter((l) => l.cartao_id === cartao.id && l.tipo === 'DESPESA' && l.status !== 'CANCELADO').map((l) => faturaDaCompra(cartao, l.data)),
  )
  return [...faturas].reduce((s, f) => s + resumoDaFatura(cartao, lancamentos, f).emAberto, 0)
}
