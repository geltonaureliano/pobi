import type { Centavos } from '../../shared/dinheiro'

export interface Cartao {
  id: number
  nome: string
  limite: Centavos
  dia_fechamento: number
  dia_vencimento: number
  conta_pagamento_id: number | null
  arquivado: 0 | 1
  bandeira: string | null
  /** Só os 4 últimos dígitos. */
  final: string | null
  emissor: string | null
  anuidade: Centavos | null
  observacao: string | null
  origem: 'MANUAL' | 'IA'
}
export type NovoCartao = Omit<Cartao, 'id' | 'arquivado' | 'origem' | 'bandeira' | 'final' | 'emissor' | 'anuidade' | 'observacao'> &
  Partial<Pick<Cartao, 'bandeira' | 'final' | 'emissor' | 'anuidade' | 'observacao' | 'origem'>>

export const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outra'].map((b) => ({ id: b, nome: b }))

/** Valor informado de uma fatura (mês de vencimento), vindo do app do banco. */
export interface FaturaInformada {
  id: number
  cartao_id: number
  competencia: string
  valor: Centavos
  observacao: string | null
  origem: 'MANUAL' | 'IA'
}
