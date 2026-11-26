import { invoke } from '@tauri-apps/api/core'
import { emTauri } from '../../db/client'
import type { Motor } from '../analise/model'
import type { AlvoAssistente, AnexoLocal } from './model'

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
  const r = alvo === 'divida'
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
