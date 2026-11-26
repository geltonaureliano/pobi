import type { Centavos } from '../../shared/dinheiro'
import type { DataISO } from '../../shared/data'

export type StatusDivida = 'ATIVA' | 'QUITADA' | 'RENEGOCIADA'
export interface Divida {
  id: number
  nome: string
  credor: string | null
  valor_total: Centavos
  taxa_mensal: number | null
  status: StatusDivida
  categoria_id: number | null
}
export interface Parcela {
  id: number
  divida_id: number
  numero: number
  valor: Centavos
  vencimento: DataISO
  pago_em: DataISO | null
  valor_pago: Centavos | null
}
