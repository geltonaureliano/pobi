import type { Centavos } from '../../shared/dinheiro'
import type { Competencia } from '../../shared/data'

export interface Orcamento {
  id: number
  categoria_id: number
  competencia: Competencia
  limite: Centavos
}
export interface ProgressoOrcamento {
  orcamento: Orcamento & { categoria_nome: string }
  gasto: Centavos
  usado: number
  restante: Centavos
  estourado: boolean
}
