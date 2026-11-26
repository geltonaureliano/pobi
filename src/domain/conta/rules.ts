import type { Centavos } from '../../shared/dinheiro'
import type { Lancamento } from '../lancamento/model'
import { efeitoNaConta } from '../lancamento/rules'
import type { Conta, ContaComSaldo } from './model'

/** Saldo = saldo inicial + efeito de todos os lançamentos pagos da conta. */
export function saldoDaConta(conta: Conta, lancamentos: Lancamento[]): Centavos {
  return lancamentos.reduce((s, l) => s + efeitoNaConta(l, conta.id), conta.saldo_inicial)
}

export function comSaldos(contas: Conta[], lancamentos: Lancamento[]): ContaComSaldo[] {
  return contas.map((c) => ({ ...c, saldo: saldoDaConta(c, lancamentos) }))
}

/** Patrimônio líquido em contas: soma dos saldos das contas não arquivadas. */
export const saldoTotal = (contas: ContaComSaldo[]) =>
  contas.filter((c) => !c.arquivada).reduce((s, c) => s + c.saldo, 0)
