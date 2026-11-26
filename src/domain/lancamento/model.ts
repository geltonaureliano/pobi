import type { Centavos } from '../../shared/dinheiro'
import type { DataISO } from '../../shared/data'

export type TipoLancamento = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA'
export type StatusLancamento = 'PAGO' | 'PENDENTE' | 'CANCELADO'
export type OrigemLancamento = 'MANUAL' | 'IMPORTACAO' | 'RECORRENTE'

export interface Lancamento {
  id: number
  descricao: string
  valor: Centavos
  tipo: TipoLancamento
  status: StatusLancamento
  data: DataISO
  conta_id: number | null
  conta_destino_id: number | null
  cartao_id: number | null
  categoria_id: number | null
  parcela_id: number | null
  origem: OrigemLancamento
  id_externo: string | null
  observacao: string | null
  /** `<cartao_id>:<AAAA-MM>` quando o lançamento é o pagamento de uma fatura. */
  fatura_ref: string | null
}

export type NovoLancamento = Omit<Lancamento, 'id' | 'origem' | 'id_externo' | 'parcela_id' | 'fatura_ref'> & {
  fatura_ref?: string | null
  origem?: OrigemLancamento
  id_externo?: string | null
  parcela_id?: number | null
}

/** Lançamento com o nome da categoria, usado nas listas e agregações. */
export interface LancamentoDetalhado extends Lancamento {
  categoria_nome: string | null
}
