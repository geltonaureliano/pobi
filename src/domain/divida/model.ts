import type { Centavos } from '../../shared/dinheiro'
import type { DataISO } from '../../shared/data'

export type StatusDivida = 'ATIVA' | 'QUITADA' | 'RENEGOCIADA'
export type TipoDivida = 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CARTAO' | 'CHEQUE_ESPECIAL' | 'ACORDO' | 'CONSIGNADO' | 'PESSOAL' | 'OUTRO'
export type SistemaAmortizacao = 'PRICE' | 'SAC' | 'SEM_JUROS' | 'OUTRO'
export interface Divida {
  id: number
  nome: string
  credor: string | null
  valor_total: Centavos
  taxa_mensal: number | null
  status: StatusDivida
  categoria_id: number | null
  tipo: TipoDivida | null
  valor_contratado: Centavos | null
  taxa_anual: number | null
  cet_anual: number | null
  sistema: SistemaAmortizacao | null
  data_contratacao: DataISO | null
  observacao: string | null
  origem: 'MANUAL' | 'IA'
}

export const TIPOS_DIVIDA: { id: TipoDivida; nome: string }[] = [
  { id: 'EMPRESTIMO', nome: 'Empréstimo' }, { id: 'FINANCIAMENTO', nome: 'Financiamento' }, { id: 'CONSIGNADO', nome: 'Consignado' },
  { id: 'CARTAO', nome: 'Parcelamento de cartão' }, { id: 'CHEQUE_ESPECIAL', nome: 'Cheque especial' }, { id: 'ACORDO', nome: 'Acordo / renegociação' },
  { id: 'PESSOAL', nome: 'Com pessoa conhecida' }, { id: 'OUTRO', nome: 'Outro' },
]
export const SISTEMAS: { id: SistemaAmortizacao; nome: string; dica?: string }[] = [
  { id: 'PRICE', nome: 'Price', dica: 'parcelas iguais' }, { id: 'SAC', nome: 'SAC', dica: 'parcelas decrescentes' },
  { id: 'SEM_JUROS', nome: 'Sem juros' }, { id: 'OUTRO', nome: 'Outro / não sei' },
]
export interface Parcela {
  id: number
  divida_id: number
  numero: number
  valor: Centavos
  vencimento: DataISO
  pago_em: DataISO | null
  valor_pago: Centavos | null
}
