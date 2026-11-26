import type { Centavos } from '../../shared/dinheiro'

export interface Cartao {
  id: number
  nome: string
  limite: Centavos
  dia_fechamento: number
  dia_vencimento: number
  conta_pagamento_id: number | null
  arquivado: 0 | 1
}
export type NovoCartao = Omit<Cartao, 'id' | 'arquivado'>
