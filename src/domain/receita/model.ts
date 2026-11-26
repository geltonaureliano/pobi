import type { Centavos } from '../../shared/dinheiro'
import type { DataISO } from '../../shared/data'

/** Receita recorrente (salário, pró-labore, aluguel recebido…). */
export interface Receita {
  id: number
  nome: string
  valor: Centavos
  dia_recebimento: number | null
  inicio: DataISO
  fim: DataISO | null
  conta_id: number | null
  categoria_id: number | null
  ativa: 0 | 1
  observacao: string | null
  /** FIXA: mesmo valor todo mês. VARIAVEL: `valor` é a média esperada, com faixa opcional. */
  tipo_valor: 'FIXA' | 'VARIAVEL'
  valor_min: Centavos | null
  valor_max: Centavos | null
  fonte: string | null
  origem: 'MANUAL' | 'IA'
}
export type NovaReceita = Omit<Receita, 'id' | 'ativa' | 'origem'> & { origem?: 'MANUAL' | 'IA' }
