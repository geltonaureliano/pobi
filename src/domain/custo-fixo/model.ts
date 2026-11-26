import type { Centavos } from '../../shared/dinheiro'
import type { DataISO } from '../../shared/data'

export interface CustoFixo {
  id: number
  nome: string
  valor: Centavos
  dia_vencimento: number | null
  inicio: DataISO
  fim: DataISO | null
  conta_id: number | null
  cartao_id: number | null
  categoria_id: number | null
}
