import type { Competencia } from '../../shared/data'

export type Motor = 'claude' | 'codex'

/** Dados agregados enviados à IA. Nunca contém o extrato linha a linha. */
export interface ResumoFinanceiro {
  competencia: Competencia
  moeda: 'BRL'
  meses: { competencia: Competencia; receitas: number; despesas: number }[]
  saldoContas: number
  categorias: { nome: string; essencial: boolean; valor: number; mesAnterior: number }[]
  orcamentos: { categoria: string; limite: number; gasto: number }[]
  receitaPrevista: number
  custosFixos: { total: number; pagos: number; emAberto: number }
  dividas: { saldoDevedor: number; parcelasAtrasadas: number; proximos30dias: number }
  maioresGastos: { descricao: string; categoria: string; valor: number }[]
  saude: { score: number; faixa: string; comprometimento: number | null; taxaPoupanca: number | null; reservaEmMeses: number | null; essenciais: number; naoEssenciais: number }
  /** Mês pela regra do app: receitas previstas × (custos fixos + faturas + parcelas). Valores em reais. */
  plano?: {
    receitas: number; despesas: number; saldoDoMes: number; saldoAteHoje: number; comprometimento: number | null
    menorSaldoNoMes: { valor: number; data: string }
    fontes: { nome: string; valor: number; regra: string }[]
    despesasPorTipo: { custosFixos: number; faturas: number; parcelas: number }
    despesasPorCategoria: { nome: string; valor: number }[]
    proximosMeses: { competencia: string; receitas: number; despesas: number; saldo: number }[]
    cartoes: { nome: string; limite: number; emAberto: number; proximasFaturas: { mes: string; valor: number }[] }[]
    dividas: { nome: string; saldoDevedor: number; parcela: number | null; restantes: number; taxaMensal: number | null }[]
  }
}

export type Severidade = 'atencao' | 'oportunidade' | 'positivo'

export interface Insight {
  titulo: string
  detalhe: string
  severidade: Severidade
  evidencia: string
}

export interface ResultadoAnalise {
  manchete: string
  resumo: string
  insights: Insight[]
  plano: { acao: string; porque: string; prazo: 'semana' | 'mes' }[]
  pontosCegos: string[]
}

export interface AnaliseSalva {
  id: number
  competencia: Competencia
  motor: Motor
  impressao: string
  resumo_json: string
  resultado_json: string
  criado_em: string
}
