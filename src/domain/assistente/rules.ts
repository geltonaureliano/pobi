import { centavosParaTexto, pctParaTexto } from '../../shared/dinheiro'
import { dataValida, type DataISO } from '../../shared/data'
import type { CamposDivida } from '../divida/form'
import { SISTEMAS, TIPOS_DIVIDA } from '../divida/model'
import type { CamposReceita } from '../receita/form'
import type { CamposCusto } from '../custo-fixo/form'
import type { CamposCartao } from '../cartao/form'
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
  "regra": "FIXA" | "VARIAVEL" | "HORAS" | "AVULSA",
  // AVULSA: recebimento único (13º, bônus, PLR, restituição, venda): informe "valor" e a data em "inicio".
  // FIXA: mesmo valor todo mês. VARIAVEL: muda de mês a mês, informe média e faixa.
  // HORAS: paga por hora trabalhada; o app calcula cada mês = dias úteis do mês trabalhado × horas/dia × valor da hora − desconto %.
  "valor": number,                // FIXA: o valor; VARIAVEL: a média; HORAS: um mês típico (referência), em reais
  "valor_min": number,            // VARIAVEL: menor valor típico
  "valor_max": number,            // VARIAVEL: maior valor típico
  "valor_hora": number,           // HORAS: valor bruto da hora, em reais
  "horas_dia": number,            // HORAS: horas por dia útil (ex.: 8)
  "desconto_pct": number,         // HORAS: % que some entre o bruto e o que cai (retenções, taxas), ex.: 6.15
  "defasagem_meses": number,      // HORAS: 1 se o pagamento de um mês é pelo trabalho do mês anterior; 0 se do próprio mês
  "dia_recebimento": number,      // 1 a 31
  "inicio": "AAAA-MM-DD",
  "fim": "AAAA-MM-DD",            // só se tiver data para acabar
  "observacao": string            // descontos, comissão, 13º, sazonalidade…
}`,
  custo: `{
  "nome": string,                 // curto e claro, ex.: "Aluguel", "Internet Vivo", "Academia"
  "valor": number,                // valor mensal, em reais
  "dia_vencimento": number,       // 1 a 31
  "categoria": string,            // nome EXATO de uma categoria de despesa existente (lista abaixo) ou um nome novo curto se nenhuma servir
  "categoria_nova": boolean,      // true se "categoria" não existe e deve ser criada
  "conta": string,                // nome exato de uma conta existente de onde sai (ou null)
  "cartao": string,               // nome exato de um cartão existente, se é cobrado no cartão (ou null)
  "inicio": "AAAA-MM-DD",
  "fim": "AAAA-MM-DD",            // só se tiver data para acabar (ex.: fidelidade)
  "observacao": string            // reajuste anual, fidelidade, multa…
}`,
  cartao: `{
  "nome": string,                 // como o usuário chama o cartão, ex.: "Nubank Roxinho", "Itaú Black"
  "emissor": string,              // banco ou empresa que emite
  "bandeira": "Visa" | "Mastercard" | "Elo" | "American Express" | "Hipercard" | "Outra",
  "final": string,                // SOMENTE os 4 últimos dígitos. Nunca escreva o número completo, CVV ou validade
  "limite": number,               // limite total, em reais
  "dia_fechamento": number,       // dia em que a fatura fecha (1 a 31)
  "dia_vencimento": number,       // dia em que a fatura vence (1 a 31)
  "conta_pagamento": string,      // nome exato de uma conta existente que paga a fatura (ou null)
  "anuidade": number,             // valor mensal da anuidade/tarifa, em reais (0 se isenta)
  "faturas": [{"mes": "AAAA-MM", "valor": number}],
                                  // faturas informadas: atual e próximas, pelo MÊS DE VENCIMENTO, valor em reais.
                                  // Ex.: "fatura de dezembro 10.125,89" e "jan 1.281,29" → [{"mes":"2026-12","valor":10125.89},{"mes":"2027-01","valor":1281.29}]
                                  // Envie a lista completa e atualizada a cada resposta. Não coloque faturas na observação.
  "observacao": string            // programa de pontos, cashback, seguro, isenção de anuidade… (sem faturas)
}`,
}

const NOME: Record<AlvoAssistente, string> = { divida: 'uma dívida', receita: 'uma receita recorrente', custo: 'um custo fixo mensal (despesa que se repete todo mês)', cartao: 'um cartão de crédito' }

export function montarPromptAssistente(p: {
  alvo: AlvoAssistente
  hoje: DataISO
  historico: MensagemChat[]
  rascunhoAtual: Record<string, unknown>
  arquivos: string[]
  /** Informações do app úteis para a IA (categorias, contas e cartões existentes). */
  contexto?: string
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

${p.contexto ? `${p.contexto}\n\n` : ''}Rascunho atual (pode estar vazio):
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

export function aplicarNaReceita(f: CamposReceita, r: Record<string, unknown>): CamposReceita {
  const novo = { ...f }
  const set = <K extends keyof CamposReceita>(k: K, v: CamposReceita[K] | null) => { if (v != null) novo[k] = v }
  set('nome', str(r.nome))
  set('fonte', str(r.fonte))
  set('regra', (umDe(r.regra, ['FIXA', 'VARIAVEL', 'HORAS', 'AVULSA']) ?? umDe(r.tipo_valor, ['FIXA', 'VARIAVEL'])) as CamposReceita['regra'] | null)
  set('valor', reais(r.valor))
  set('valor_min', reais(r.valor_min))
  set('valor_max', reais(r.valor_max))
  set('valor_hora', reais(r.valor_hora))
  set('horas_dia', pct(r.horas_dia))
  set('desconto_pct', pct(r.desconto_pct))
  const def = num(r.defasagem_meses)
  if (def != null && def >= 0 && def <= 3) novo.defasagem = String(Math.round(def))
  const dia = num(r.dia_recebimento)
  if (dia != null && dia >= 1 && dia <= 31) novo.dia = String(Math.round(dia))
  set('inicio', data(r.inicio))
  set('fim', data(r.fim))
  set('observacao', str(r.observacao))
  if (novo.valor_hora && r.regra == null) novo.regra = 'HORAS'
  else if ((novo.valor_min || novo.valor_max) && novo.regra === 'FIXA' && r.regra == null) novo.regra = 'VARIAVEL'
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

const normalizar = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()

/** Acha pelo nome, sem ligar para acento e maiúsculas; aceita "contém" quando é único. */
export function acharPorNome<T extends { id: number; nome: string }>(itens: T[], nome: unknown): T | null {
  if (typeof nome !== 'string' || !nome.trim()) return null
  const n = normalizar(nome)
  const exato = itens.find((i) => normalizar(i.nome) === n)
  if (exato) return exato
  const parecidos = itens.filter((i) => normalizar(i.nome).includes(n) || n.includes(normalizar(i.nome)))
  return parecidos.length === 1 ? parecidos[0] : null
}

export interface ContextoCusto {
  categorias: { id: number; nome: string }[]
  contas: { id: number; nome: string }[]
  cartoes: { id: number; nome: string }[]
}

export const contextoDoCusto = (c: ContextoCusto) =>
  `Categorias de despesa existentes: ${c.categorias.map((k) => k.nome).join(', ') || '(nenhuma)'}.
Contas: ${c.contas.map((k) => k.nome).join(', ') || '(nenhuma)'}. Cartões: ${c.cartoes.map((k) => k.nome).join(', ') || '(nenhum)'}.
Escolha a categoria existente que mais combina com o custo; só proponha uma nova (categoria_nova: true) se nenhuma fizer sentido.`

export function aplicarNoCusto(f: CamposCusto, r: Record<string, unknown>, ctx: ContextoCusto): CamposCusto {
  const novo = { ...f }
  const set = <K extends keyof CamposCusto>(k: K, v: CamposCusto[K] | null) => { if (v != null) novo[k] = v }
  set('nome', str(r.nome))
  set('valor', reais(r.valor))
  const dia = num(r.dia_vencimento)
  if (dia != null && dia >= 1 && dia <= 31) novo.dia = String(Math.round(dia))
  set('inicio', data(r.inicio))
  set('fim', data(r.fim))
  set('observacao', str(r.observacao))
  const cat = acharPorNome(ctx.categorias, r.categoria)
  if (cat) { novo.categoria_id = String(cat.id); novo.categoria_nova = '' }
  else if (str(r.categoria)) { novo.categoria_id = ''; novo.categoria_nova = str(r.categoria)! }
  const cartao = acharPorNome(ctx.cartoes, r.cartao)
  const conta = acharPorNome(ctx.contas, r.conta)
  if (cartao) { novo.cartao_id = String(cartao.id); novo.conta_id = '' }
  else if (conta) { novo.conta_id = String(conta.id); novo.cartao_id = '' }
  return novo
}

export const contextoDoCartao = (contas: { nome: string }[]) =>
  `Contas existentes (para "conta_pagamento"): ${contas.map((c) => c.nome).join(', ') || '(nenhuma)'}.
Se a fatura mostrar fechamento e vencimento, use esses dias.
Valores de faturas (atual e próximas, inclusive parcelas futuras que o app do banco mostra) vão em "faturas", pelo mês de vencimento. Se só houver o vencimento, deixe o fechamento null e peça em "pendencias".
Nunca repita números completos de cartão, CVV ou validade, nem na resposta.`

const BANDEIRAS_IA = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outra']

export function aplicarNoCartao(f: CamposCartao, r: Record<string, unknown>, contas: { id: number; nome: string }[]): CamposCartao {
  const novo = { ...f }
  const set = <K extends keyof CamposCartao>(k: K, v: CamposCartao[K] | null) => { if (v != null) novo[k] = v }
  set('nome', str(r.nome))
  set('emissor', str(r.emissor))
  const b = str(r.bandeira)
  if (b) novo.bandeira = BANDEIRAS_IA.find((x) => normalizar(x) === normalizar(b) || (normalizar(b).startsWith('master') && x === 'Mastercard') || (normalizar(b).includes('amex') && x === 'American Express')) ?? 'Outra'
  // Só os 4 últimos dígitos, mesmo que venha o número inteiro.
  const digitos = typeof r.final === 'string' || typeof r.final === 'number' ? String(r.final).replace(/\D/g, '') : ''
  if (digitos.length >= 4) novo.final = digitos.slice(-4)
  const limite = num(r.limite)
  if (limite != null && limite >= 0) novo.limite = centavosParaTexto(Math.round(limite * 100))
  for (const k of ['dia_fechamento', 'dia_vencimento'] as const) {
    const d = num(r[k])
    if (d != null && d >= 1 && d <= 31) novo[k] = String(Math.round(d))
  }
  const conta = acharPorNome(contas, r.conta_pagamento)
  if (conta) novo.conta_pagamento_id = String(conta.id)
  const anuidade = num(r.anuidade)
  if (anuidade != null && anuidade >= 0) novo.anuidade = centavosParaTexto(Math.round(anuidade * 100))
  set('observacao', str(r.observacao))
  if (Array.isArray(r.faturas)) {
    const lista = r.faturas
      .map((x) => {
        const o = (x ?? {}) as Record<string, unknown>
        const mes = typeof o.mes === 'string' ? o.mes.slice(0, 7) : typeof o.competencia === 'string' ? o.competencia.slice(0, 7) : ''
        const v = num(o.valor)
        return /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) && v != null && v >= 0 ? { competencia: mes, valor: centavosParaTexto(Math.round(v * 100)) } : null
      })
      .filter((x): x is { competencia: string; valor: string } => x != null)
    if (lista.length) {
      const porMes = new Map(novo.faturas.map((x) => [x.competencia, x]))
      lista.forEach((x) => porMes.set(x.competencia, x))
      novo.faturas = [...porMes.values()].sort((a, b) => a.competencia.localeCompare(b.competencia))
    }
  }
  return novo
}
