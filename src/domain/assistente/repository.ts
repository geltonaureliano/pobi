import { invoke } from '@tauri-apps/api/core'
import { banco, emTauri } from '../../db/client'
import type { Motor } from '../analise/model'
import type { AlvoAssistente, AnexoLocal, ConversaIA } from './model'

/** Roda o CLI local com os anexos numa pasta temporária, só para leitura. */
export async function executarAssistente(motor: Motor, prompt: string, anexos: AnexoLocal[], alvo: AlvoAssistente, textoUsuario: string): Promise<string> {
  if (!emTauri()) return simular(alvo, textoUsuario, anexos)
  return invoke('executar_ia', { motor, prompt, anexos: anexos.map((a) => ({ nome: a.nome, base64: a.base64 })) })
}

export function lerArquivo(f: File): Promise<AnexoLocal> {
  return new Promise((ok, falha) => {
    const r = new FileReader()
    r.onerror = () => falha(new Error(`Não consegui ler ${f.name}.`))
    r.onload = () => {
      const url = String(r.result)
      ok({ id: crypto.randomUUID(), nome: f.name, tipo: f.type, tamanho: f.size, base64: url.slice(url.indexOf(',') + 1) })
    }
    r.readAsDataURL(f)
  })
}

/* ------------------------------------------------------------------ */
/* Modo navegador (npm run dev): simula a IA com heurísticas simples,  */
/* só para desenvolver a interface. No app desktop nunca é usado.      */
/* ------------------------------------------------------------------ */

function simular(alvo: AlvoAssistente, t: string, anexos: AnexoLocal[]): Promise<string> {
  const valores = [...t.matchAll(/R?\$?\s?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:,\d{2})?)/g)].map((m) => Number(m[1].replace(/\./g, '').replace(',', '.')))
  const parcelas = Number(t.match(/(\d+)\s*x/i)?.[1] ?? t.match(/(\d+)\s*parcelas/i)?.[1] ?? 0) || null
  const pagas = Number(t.match(/(?:paguei|pagas?)\s*(\d+)/i)?.[1] ?? 0) || null
  const taxa = Number((t.match(/(\d+(?:[,.]\d+)?)\s*%/)?.[1] ?? '').replace(',', '.')) || null
  const grandes = valores.filter((v) => v >= 50).sort((a, b) => b - a)
  const r = alvo === 'cartao'
    ? {
        resposta: 'Modo demonstração (no navegador a IA local não roda). Montei o cartão com o que você escreveu. Confira ao lado.',
        resumo: 'Cartão de crédito a confirmar.',
        confianca: 'media',
        pendencias: [!/fecha/i.test(t) && 'Em que dia a fatura fecha?'].filter(Boolean),
        rascunho: {
          nome: t.match(/(nubank[^,]*|ita[uú][^,]*|inter[^,]*|c6[^,]*|bradesco[^,]*|santander[^,]*)/i)?.[1]?.trim() ?? null,
          emissor: /nubank/i.test(t) ? 'Nubank' : /ita[uú]/i.test(t) ? 'Itaú' : /inter/i.test(t) ? 'Inter' : null,
          bandeira: /master/i.test(t) ? 'Mastercard' : /visa/i.test(t) ? 'Visa' : /elo\b/i.test(t) ? 'Elo' : null,
          final: t.match(/final\s*(\d{4})/i)?.[1] ?? null,
          limite: grandes[0] ?? null,
          dia_fechamento: Number(t.match(/fecha\D*(\d{1,2})/i)?.[1] ?? 0) || null,
          dia_vencimento: Number(t.match(/vence\D*(\d{1,2})/i)?.[1] ?? 0) || null,
          anuidade: /sem anuidade|isent/i.test(t) ? 0 : null,
        },
      }
    : alvo === 'custo'
    ? {
        resposta: 'Modo demonstração (no navegador a IA local não roda). Montei o custo fixo com o que você escreveu e escolhi a categoria que mais combina. Confira ao lado.',
        resumo: 'Custo fixo mensal a confirmar.',
        confianca: 'media',
        pendencias: ['Confirme de qual conta ou cartão sai.'],
        rascunho: {
          nome: /aluguel/i.test(t) ? 'Aluguel' : /internet|vivo|claro/i.test(t) ? 'Internet' : /academia/i.test(t) ? 'Academia' : /condom/i.test(t) ? 'Condomínio' : /pet|ra[cç][aã]o/i.test(t) ? 'Pet' : null,
          valor: grandes[0] ?? valores[0] ?? null,
          dia_vencimento: Number(t.match(/dia\s*(\d{1,2})/i)?.[1] ?? 0) || null,
          categoria: /aluguel|condom/i.test(t) ? 'Moradia' : /internet|netflix|spotify|vivo|claro/i.test(t) ? 'Assinaturas' : /academia|plano/i.test(t) ? 'Saúde' : /pet|ra[cç][aã]o/i.test(t) ? 'Pets' : null,
          categoria_nova: /pet|ra[cç][aã]o/i.test(t),
          cartao: /cart[aã]o/i.test(t) ? 'Nubank Roxinho' : null,
        },
      }
    : alvo === 'divida'
    ? {
        resposta: `Modo demonstração (no navegador a IA local não roda). Li ${anexos.length ? `${anexos.length} arquivo(s) e ` : ''}sua mensagem e montei um rascunho. Confira os campos ao lado.`,
        resumo: parcelas ? `Dívida em ${parcelas} parcelas${grandes[0] ? ` de cerca de R$ ${grandes[grandes.length - 1].toLocaleString('pt-BR')}` : ''}.` : 'Dívida a confirmar.',
        confianca: 'media',
        pendencias: [!parcelas && 'Quantas parcelas tem o contrato?', !taxa && 'Qual a taxa de juros ao mês?', 'Confirme a data da primeira parcela.'].filter(Boolean),
        rascunho: {
          nome: /carro|ve[ií]culo/i.test(t) ? 'Financiamento do carro' : /casa|im[oó]vel|apto/i.test(t) ? 'Financiamento do imóvel' : /empr[eé]stimo/i.test(t) ? 'Empréstimo pessoal' : null,
          tipo: /financ/i.test(t) ? 'FINANCIAMENTO' : /empr[eé]stimo/i.test(t) ? 'EMPRESTIMO' : null,
          valor_contratado: grandes.length > 1 ? grandes[0] : null,
          valor_parcela: parcelas && grandes.length ? grandes[grandes.length - 1] : null,
          parcelas, parcelas_pagas: pagas, taxa_mensal: taxa, sistema: taxa ? 'PRICE' : null,
        },
      }
    : {
        resposta: 'Modo demonstração (no navegador a IA local não roda). Montei um rascunho com o que você escreveu. Confira ao lado.',
        resumo: 'Receita recorrente a confirmar.',
        confianca: 'media',
        pendencias: ['Confirme o dia em que o dinheiro cai.'],
        rascunho: {
          nome: /sal[aá]rio/i.test(t) ? 'Salário' : /freela/i.test(t) ? 'Freela' : null,
          tipo_valor: /vari|entre|depende/i.test(t) || valores.length > 1 ? 'VARIAVEL' : 'FIXA',
          valor: grandes.length ? grandes.reduce((s, v) => s + v, 0) / grandes.length : null,
          valor_min: grandes.length > 1 ? grandes[grandes.length - 1] : null,
          valor_max: grandes.length > 1 ? grandes[0] : null,
          dia_recebimento: Number(t.match(/dia\s*(\d{1,2})/i)?.[1] ?? 0) || null,
        },
      }
  return new Promise((ok) => setTimeout(() => ok(JSON.stringify(r)), 1400))
}

/* ------------------------------------------------------------------ */
/* Conversas salvas                                                     */
/* ------------------------------------------------------------------ */

interface LinhaConversa {
  id: string; alvo: AlvoAssistente; titulo: string; status: ConversaIA['status']; item_id: number | null; motor: string | null
  mensagens_json: string; campos_json: string; meta_json: string | null; anexos_json: string; criado_em: string; atualizado_em: string
}

const json = <T,>(t: string | null, padrao: T): T => { try { return t ? (JSON.parse(t) as T) : padrao } catch { return padrao } }

const daLinha = (l: LinhaConversa): ConversaIA => ({
  id: l.id, alvo: l.alvo, titulo: l.titulo, status: l.status, item_id: l.item_id, motor: l.motor,
  mensagens: json(l.mensagens_json, []), campos: json(l.campos_json, {}), meta: json(l.meta_json, null), anexos: json(l.anexos_json, []),
  criado_em: l.criado_em, atualizado_em: l.atualizado_em,
})

/** Lista sem carregar os anexos (podem ser grandes). */
export async function listarConversas(alvo: AlvoAssistente): Promise<ConversaIA[]> {
  const linhas = await (await banco()).select<LinhaConversa>(
    `SELECT id, alvo, titulo, status, item_id, motor, mensagens_json, campos_json, meta_json, '[]' AS anexos_json, criado_em, atualizado_em
     FROM conversas_ia WHERE alvo = $1 ORDER BY status = 'RASCUNHO' DESC, atualizado_em DESC`, [alvo])
  return linhas.map(daLinha)
}

export async function buscarConversa(id: string): Promise<ConversaIA | null> {
  const [l] = await (await banco()).select<LinhaConversa>('SELECT * FROM conversas_ia WHERE id = $1', [id])
  return l ? daLinha(l) : null
}

/** Até 30 MB de anexos são guardados junto, para a IA poder reler o arquivo ao continuar a conversa. */
const LIMITE_ANEXOS = 30 * 1024 * 1024

export async function salvarConversa(c: Omit<ConversaIA, 'criado_em' | 'atualizado_em'>) {
  let total = 0
  const anexos = c.anexos.map((a) => {
    total += a.tamanho
    return total <= LIMITE_ANEXOS ? a : { ...a, base64: '' }
  })
  await (await banco()).execute(
    `INSERT INTO conversas_ia (id, alvo, titulo, status, item_id, motor, mensagens_json, campos_json, meta_json, anexos_json)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (id) DO UPDATE SET titulo = excluded.titulo, status = excluded.status, item_id = excluded.item_id, motor = excluded.motor,
       mensagens_json = excluded.mensagens_json, campos_json = excluded.campos_json, meta_json = excluded.meta_json,
       anexos_json = excluded.anexos_json, atualizado_em = datetime('now')`,
    [c.id, c.alvo, c.titulo, c.status, c.item_id, c.motor, JSON.stringify(c.mensagens), JSON.stringify(c.campos),
      c.meta ? JSON.stringify(c.meta) : null, JSON.stringify(anexos)],
  )
}

export async function excluirConversa(id: string) {
  await (await banco()).execute('DELETE FROM conversas_ia WHERE id = $1', [id])
}

/** Última conversa ligada a um item cadastrado (para editar com o histórico). */
export async function buscarConversaDoItem(alvo: AlvoAssistente, item_id: number): Promise<ConversaIA | null> {
  const [l] = await (await banco()).select<LinhaConversa>(
    'SELECT * FROM conversas_ia WHERE alvo = $1 AND item_id = $2 ORDER BY atualizado_em DESC LIMIT 1', [alvo, item_id])
  return l ? daLinha(l) : null
}
