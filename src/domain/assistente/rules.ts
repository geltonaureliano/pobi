import { centavosParaTexto, pctParaTexto } from '../../shared/dinheiro'
import { dataValida, type DataISO } from '../../shared/data'
import type { CamposDivida } from '../divida/form'
import { SISTEMAS, TIPOS_DIVIDA } from '../divida/model'
import type { CamposRecorrente } from '../../shared/recorrente'
import type { AlvoAssistente, Confianca, MensagemChat, RespostaAssistente } from './model'

/* ------------------------------------------------------------------ */
/* Formato que pedimos à IA                                            */
/* ------------------------------------------------------------------ */

const CAMPOS: Record<AlvoAssistente, string> = {
  divida: `{
  "nome": string,                 // nome curto e claro, ex.: "Financiamento do carro"
  "tipo": ${TIPOS_DIVIDA.map((t) => `"${t.id}"`).join(' | ')},
  "credor": string,               // banco, loja ou pessoa
  "valor_contratado": number,     // valor emprestado/financiado (principal), em reais
  "valor_parcela": number,        // valor de cada parcela, em reais
  "total_a_pagar": number,        // soma de todas as parcelas, em reais (use quando não houver parcela fixa)
  "parcelas": number,             // quantidade total de parcelas do contrato
  "parcelas_pagas": number,       // quantas já foram pagas
  "primeiro_vencimento": "AAAA-MM-DD", // vencimento da PRIMEIRA parcela do contrato
  "data_contratacao": "AAAA-MM-DD",
  "taxa_mensal": number,          // juros ao mês, em %, ex.: 1.99
  "taxa_anual": number,           // juros ao ano, em %
  "cet_anual": number,            // custo efetivo total ao ano, em %
  "sistema": ${SISTEMAS.map((s) => `"${s.id}"`).join(' | ')},
  "observacao": string            // detalhes úteis: garantia, seguro, IOF, multa, carência…
}`,
  receita: `{
  "nome": string,                 // ex.: "Salário", "Freela Studio X"
  "fonte": string,                // quem paga
  "tipo_valor": "FIXA" | "VARIAVEL",
  "valor": number,                // valor mensal (se variável, a média esperada), em reais
  "valor_min": number,            // se variável: menor valor típico
  "valor_max": number,            // se variável: maior valor típico
  "dia_recebimento": number,      // 1 a 31
  "inicio": "AAAA-MM-DD",
  "fim": "AAAA-MM-DD",            // só se tiver data para acabar
  "observacao": string            // descontos, comissão, 13º, sazonalidade…
}`,
}

const NOME: Record<AlvoAssistente, string> = { divida: 'uma dívida', receita: 'uma receita recorrente' }

export function montarPromptAssistente(p: {
  alvo: AlvoAssistente
  hoje: DataISO
  historico: MensagemChat[]
  rascunhoAtual: Record<string, unknown>
  arquivos: string[]
}): string {
  const conversa = p.historico
    .filter((m) => !m.erro)
    .map((m) => `${m.autor === 'voce' ? 'USUÁRIO' : 'ASSISTENTE'}: ${m.texto || '(sem texto)'}${m.anexos.length ? `\n[anexou: ${m.anexos.map((a) => a.nome).join(', ')}]` : ''}`)
    .join('\n\n')
  return `Você é o assistente de cadastro do Pobi, um app de finanças pessoais em português do Brasil.
O usuário quer cadastrar ${NOME[p.alvo]}. Hoje é ${p.hoje}.

${p.arquivos.length ? `Arquivos anexados nesta pasta (leia todos com atenção, inclusive PDFs e imagens): ${p.arquivos.join(', ')}.` : 'Nenhum arquivo foi anexado nesta mensagem.'}

Seu trabalho:
1. Entender do que se trata, pelos arquivos e pelo que o usuário escreveu.
2. Extrair os dados no formato abaixo. Use SOMENTE o que está nos arquivos ou foi dito. Nunca invente números.
   Se puder CALCULAR algo com segurança (ex.: total = parcela × quantidade, taxa anual a partir da mensal), calcule e diga na resposta que calculou.
3. O que faltar ou estiver ambíguo: deixe null e explique em "pendencias" (frases curtas, o que o usuário precisa confirmar).
4. Responder ao usuário em "resposta": tom profissional e próximo, frases curtas, sem markdown pesado. Se ele fez uma pergunta, responda.
   Se o arquivo não parecer ${NOME[p.alvo]}, avise.
5. Mantenha os valores do rascunho atual que continuam válidos; altere só o que a nova informação mudar.

Rascunho atual (pode estar vazio):
${JSON.stringify(p.rascunhoAtual)}

Conversa até agora:
${conversa || '(início)'}

Responda APENAS com um JSON válido, sem markdown, neste formato:
{"resposta": string, "resumo": string (uma frase dizendo o que é), "confianca": "alta" | "media" | "baixa",
 "pendencias": [string],
 "rascunho": ${CAMPOS[p.alvo]}}`
}

/* ------------------------------------------------------------------ */
/* Leitura da resposta                                                 */
/* ------------------------------------------------------------------ */

const texto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

export function interpretarAssistente(saida: string): RespostaAssistente {
  const limpo = saida.replace(/```(?:json)?/g, '')
  const ini = limpo.indexOf('{')
  const fim = limpo.lastIndexOf('}')
  if (ini < 0 || fim <= ini) {
    // Sem JSON: trata a saída inteira como conversa, sem mexer no rascunho.
    if (texto(saida)) return { resposta: saida.trim(), resumo: null, confianca: null, rascunho: {}, pendencias: [] }
    throw new Error('A IA não respondeu nada.')
  }
  let j: Record<string, unknown>
  try {
    j = JSON.parse(limpo.slice(ini, fim + 1))
  } catch {
    throw new Error('A IA devolveu um JSON inválido. Tente de novo.')
  }
  const conf = ['alta', 'media', 'baixa'].includes(j.confianca as string) ? (j.confianca as Confianca) : null
  const rascunho = j.rascunho && typeof j.rascunho === 'object' ? (j.rascunho as Record<string, unknown>) : {}
  return {
    resposta: texto(j.resposta) ? j.resposta.trim() : 'Pronto, veja o resumo ao lado.',
    resumo: texto(j.resumo) ? j.resumo.trim() : null,
    confianca: conf,
    rascunho,
    pendencias: (Array.isArray(j.pendencias) ? j.pendencias : []).filter(texto).map((x) => x.trim()),
  }
}

/* ------------------------------------------------------------------ */
/* Rascunho da IA → campos do formulário                               */
/* ------------------------------------------------------------------ */

const num = (v: unknown): number | null => {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const t = v.replace(/[R$%\s]/g, '')
    const n = Number(t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t)
    return Number.isFinite(n) ? n : null
  }
  return null
}
const reais = (v: unknown) => { const n = num(v); return n != null && n > 0 ? centavosParaTexto(Math.round(n * 100)) : null }
const inteiro = (v: unknown) => { const n = num(v); return n != null && n >= 0 ? String(Math.round(n)) : null }
const pct = (v: unknown) => { const n = num(v); return n != null && n >= 0 ? pctParaTexto(n) : null }
const data = (v: unknown) => (typeof v === 'string' && dataValida(v.slice(0, 10)) ? v.slice(0, 10) : null)
const str = (v: unknown) => (texto(v) ? v.trim() : null)
const umDe = (v: unknown, ids: string[]) => (typeof v === 'string' && ids.includes(v.toUpperCase()) ? v.toUpperCase() : null)

/** Aplica no formulário só o que a IA preencheu; o resto fica como está. */
export function aplicarNaDivida(f: CamposDivida, r: Record<string, unknown>): CamposDivida {
  const novo = { ...f }
  const set = <K extends keyof CamposDivida>(k: K, v: CamposDivida[K] | null) => { if (v != null) novo[k] = v }
  set('nome', str(r.nome))
  set('tipo', umDe(r.tipo, TIPOS_DIVIDA.map((t) => t.id)))
  set('credor', str(r.credor))
  set('contratado', reais(r.valor_contratado))
  const parcela = reais(r.valor_parcela)
  const total = reais(r.total_a_pagar)
  if (parcela) { novo.modo = 'PARCELA'; novo.valor_parcela = parcela }
  else if (total) { novo.modo = 'TOTAL'; novo.total = total }
  if (total) novo.total = total
  set('parcelas', inteiro(r.parcelas))
  set('parcelas_pagas', inteiro(r.parcelas_pagas))
  set('primeiro', data(r.primeiro_vencimento))
  set('data_contratacao', data(r.data_contratacao))
  set('taxa', pct(r.taxa_mensal))
  set('taxa_anual', pct(r.taxa_anual))
  set('cet', pct(r.cet_anual))
  set('sistema', umDe(r.sistema, SISTEMAS.map((s) => s.id)))
  set('observacao', str(r.observacao))
  return novo
}

export function aplicarNaReceita(f: CamposRecorrente, r: Record<string, unknown>): CamposRecorrente {
  const novo = { ...f }
  const set = <K extends keyof CamposRecorrente>(k: K, v: CamposRecorrente[K] | null) => { if (v != null) novo[k] = v }
  set('nome', str(r.nome))
  set('fonte', str(r.fonte))
  set('tipo_valor', umDe(r.tipo_valor, ['FIXA', 'VARIAVEL']) as 'FIXA' | 'VARIAVEL' | null)
  set('valor', reais(r.valor))
  set('valor_min', reais(r.valor_min))
  set('valor_max', reais(r.valor_max))
  const dia = num(r.dia_recebimento)
  if (dia != null && dia >= 1 && dia <= 31) novo.dia = String(Math.round(dia))
  set('inicio', data(r.inicio))
  set('fim', data(r.fim))
  set('observacao', str(r.observacao))
  if (novo.valor_min || novo.valor_max) novo.tipo_valor ??= 'VARIAVEL'
  return novo
}

/** Campos do formulário → rascunho em reais, para a IA saber o estado atual (inclusive o que o usuário corrigiu). */
export function rascunhoDosCampos(f: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== '' && v != null))
}

export const tamanhoLegivel = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`

/** Título da conversa: o nome do item, o resumo da IA ou o começo da primeira mensagem. */
export function tituloDaConversa(nome: string | undefined, resumo: string | null | undefined, mensagens: MensagemChat[]): string {
  if (nome?.trim()) return nome.trim()
  if (resumo?.trim()) return resumo.trim().slice(0, 80)
  const primeira = mensagens.find((m) => m.autor === 'voce')
  if (primeira?.texto) return primeira.texto.length > 60 ? `${primeira.texto.slice(0, 57)}…` : primeira.texto
  if (primeira?.anexos.length) return primeira.anexos[0].nome
  return 'Nova conversa'
}

/** "agora", "há 5 min", "há 3 h", "ontem", "12/11". `quando` vem do SQLite em UTC (AAAA-MM-DD HH:MM:SS). */
export function quandoLegivel(quando: string, agora = new Date()): string {
  const d = new Date(quando.includes('T') ? quando : `${quando.replace(' ', 'T')}Z`)
  const min = Math.round((agora.getTime() - d.getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  if (min < 24 * 60 && d.getDate() === agora.getDate()) return `há ${Math.round(min / 60)} h`
  const ontem = new Date(agora); ontem.setDate(agora.getDate() - 1)
  if (d.toDateString() === ontem.toDateString()) return 'ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
