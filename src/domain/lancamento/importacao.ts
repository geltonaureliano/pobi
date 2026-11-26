import { paraCentavos } from '../../shared/dinheiro'
import { dataValida } from '../../shared/data'

/**
 * Importação de extrato CSV. Aceita separador ";" ou ",", data em DD/MM/AAAA ou
 * AAAA-MM-DD, e valor com sinal (negativo = despesa). Colunas detectadas pelo
 * cabeçalho: data, descrição/histórico, valor.
 */
export interface LinhaImportada {
  data: string
  descricao: string
  valor: number
  tipo: 'RECEITA' | 'DESPESA'
  id_externo: string
}

export interface ResultadoImportacao {
  linhas: LinhaImportada[]
  ignoradas: { linha: number; motivo: string }[]
}

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

function dividir(linha: string, sep: string): string[] {
  const out: string[] = []
  let atual = ''
  let aspas = false
  for (const ch of linha) {
    if (ch === '"') aspas = !aspas
    else if (ch === sep && !aspas) {
      out.push(atual)
      atual = ''
    } else atual += ch
  }
  out.push(atual)
  return out.map((c) => c.trim())
}

function data(v: string): string | null {
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const iso = br ? `${br[3]}-${br[2]}-${br[1]}` : v
  return dataValida(iso) ? iso : null
}

/** Identificador estável para não importar a mesma linha duas vezes. */
export function idExterno(contaId: number, d: string, descricao: string, valor: number, ocorrencia: number) {
  return `csv:${contaId}:${d}:${valor}:${normalizar(descricao)}:${ocorrencia}`
}

export function lerCSV(texto: string, contaId: number): ResultadoImportacao {
  const linhas = texto.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim())
  if (!linhas.length) return { linhas: [], ignoradas: [] }
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ';' : ','
  const cab = dividir(linhas[0], sep).map(normalizar)
  const iData = cab.findIndex((c) => c.startsWith('data'))
  const iDesc = cab.findIndex((c) => /descri|histor|lancamento|memo/.test(c))
  const iValor = cab.findIndex((c) => c.startsWith('valor') || c === 'amount')
  if (iData < 0 || iDesc < 0 || iValor < 0) {
    return { linhas: [], ignoradas: [{ linha: 1, motivo: 'Cabeçalho precisa ter as colunas data, descrição e valor.' }] }
  }
  const vistos = new Map<string, number>()
  const out: ResultadoImportacao = { linhas: [], ignoradas: [] }
  linhas.slice(1).forEach((l, i) => {
    const cols = dividir(l, sep)
    const d = data(cols[iData] ?? '')
    const v = paraCentavos(cols[iValor] ?? '')
    const desc = (cols[iDesc] ?? '').trim()
    if (!d) return out.ignoradas.push({ linha: i + 2, motivo: 'Data inválida.' })
    if (v == null || v === 0) return out.ignoradas.push({ linha: i + 2, motivo: 'Valor inválido.' })
    const chave = `${d}|${v}|${normalizar(desc)}`
    const n = (vistos.get(chave) ?? 0) + 1
    vistos.set(chave, n)
    out.linhas.push({
      data: d,
      descricao: desc || 'Sem descrição',
      valor: Math.abs(v),
      tipo: v < 0 ? 'DESPESA' : 'RECEITA',
      id_externo: idExterno(contaId, d, desc, v, n),
    })
  })
  return out
}
