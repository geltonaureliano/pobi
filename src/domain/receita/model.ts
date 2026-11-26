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
}
