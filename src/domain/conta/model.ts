import type { Centavos } from '../../shared/dinheiro'

export type TipoConta = 'CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA'
export interface Conta {
  id: number
  nome: string
  tipo: TipoConta
  saldo_inicial: Centavos
  principal: 0 | 1
  arquivada: 0 | 1
}
export type NovaConta = Pick<Conta, 'nome' | 'tipo' | 'saldo_inicial'>
export interface ContaComSaldo extends Conta {
  saldo: Centavos
}
