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
  /** Como calcular o valor de cada mês. */
  regra: RegraReceita
  /** Só HORAS: valor da hora (centavos), horas por dia, desconto/retenção em % e mês de referência. */
  valor_hora: Centavos | null
  horas_dia: number | null
  desconto_pct: number | null
  defasagem_meses: number
}

/** AVULSA: recebimento único (13º, bônus, restituição), na data de `inicio`. */
export type RegraReceita = 'FIXA' | 'VARIAVEL' | 'HORAS' | 'AVULSA'

/** Ajuste manual de uma receita em um mês (dias trabalhados ou valor já conhecido). */
export interface AjusteReceitaMes {
  receita_id: number
  competencia: string
  dias: number | null
  valor: Centavos | null
  observacao: string | null
}
export type NovaReceita = Omit<Receita, 'id' | 'ativa' | 'origem' | 'regra' | 'valor_hora' | 'horas_dia' | 'desconto_pct' | 'defasagem_meses'> & {
  origem?: 'MANUAL' | 'IA'
  regra?: RegraReceita; valor_hora?: Centavos | null; horas_dia?: number | null; desconto_pct?: number | null; defasagem_meses?: number
}
