/** O que o assistente está ajudando a cadastrar. */
export type AlvoAssistente = 'divida' | 'receita'

export interface AnexoLocal {
  id: string
  nome: string
  tipo: string
  tamanho: number
  /** Conteúdo em base64 (sem o prefixo data:). */
  base64: string
}

export interface MensagemChat {
  id: string
  autor: 'voce' | 'ia'
  texto: string
  anexos: { nome: string; tamanho: number }[]
  /** Campos do formulário que a IA preencheu ou mudou nesta resposta. */
  campos?: string[]
  /** Mensagem de erro (falha do CLI, resposta fora do formato). */
  erro?: boolean
}

export type Confianca = 'alta' | 'media' | 'baixa'

/** Resposta interpretada do assistente. Valores do rascunho em reais (número) e datas AAAA-MM-DD. */
export interface RespostaAssistente {
  resposta: string
  resumo: string | null
  confianca: Confianca | null
  rascunho: Record<string, unknown>
  pendencias: string[]
}

export interface MetaConversa {
  resumo: string | null
  confianca: Confianca | null
  pendencias: string[]
}

/** Conversa com o assistente, salva a cada mensagem. Fica como rascunho até o cadastro ser confirmado. */
export interface ConversaIA {
  id: string
  alvo: AlvoAssistente
  titulo: string
  status: 'RASCUNHO' | 'CONCLUIDA'
  item_id: number | null
  motor: string | null
  mensagens: MensagemChat[]
  /** Campos do formulário de revisão como estavam (texto). */
  campos: Record<string, unknown>
  meta: MetaConversa | null
  anexos: AnexoLocal[]
  criado_em: string
  atualizado_em: string
}
