import { centavosParaTexto, paraCentavos, pctParaTexto, textoParaNumero } from '../../shared/dinheiro'
import { dataValida, hoje } from '../../shared/data'
import type { Divida, SistemaAmortizacao, StatusDivida, TipoDivida } from './model'
import type { NovaDivida } from './repository'

/** Campos do formulário de dívida (texto, como digitado). */
export interface CamposDivida {
  nome: string
  tipo: string
  credor: string
  contratado: string
  modo: 'PARCELA' | 'TOTAL'
  valor_parcela: string
  total: string
  parcelas: string
  parcelas_pagas: string
  primeiro: string
  data_contratacao: string
  taxa: string
  taxa_anual: string
  cet: string
  sistema: string
  categoria_id: string
  observacao: string
  status: StatusDivida
}

export type ErrosDivida = Partial<Record<keyof CamposDivida, string>>

export const camposDividaVazios = (categoria_id = ''): CamposDivida => ({
  nome: '', tipo: '', credor: '', contratado: '', modo: 'PARCELA', valor_parcela: '', total: '', parcelas: '', parcelas_pagas: '',
  primeiro: hoje(), data_contratacao: '', taxa: '', taxa_anual: '', cet: '', sistema: '', categoria_id, observacao: '', status: 'ATIVA',
})

export const camposDeDivida = (d: Divida): CamposDivida => ({
  ...camposDividaVazios(d.categoria_id ? String(d.categoria_id) : ''),
  nome: d.nome, tipo: d.tipo ?? '', credor: d.credor ?? '', contratado: centavosParaTexto(d.valor_contratado), total: centavosParaTexto(d.valor_total),
  modo: 'TOTAL', primeiro: '', data_contratacao: d.data_contratacao ?? '', taxa: pctParaTexto(d.taxa_mensal), taxa_anual: pctParaTexto(d.taxa_anual),
  cet: pctParaTexto(d.cet_anual), sistema: d.sistema ?? '', observacao: d.observacao ?? '', status: d.status,
})

/** Total a pagar segundo o formulário (parcela × N, ou o total informado). */
export function totalDoFormulario(f: CamposDivida): number | null {
  const n = Number(f.parcelas)
  if (f.modo === 'PARCELA') {
    const p = paraCentavos(f.valor_parcela)
    return p && n > 0 ? p * n : null
  }
  return paraCentavos(f.total)
}

const pct = (t: string, campo: keyof CamposDivida, erros: ErrosDivida) => {
  const v = textoParaNumero(t)
  if (v != null && !(v >= 0 && v < 1000)) erros[campo] = 'Percentual inválido.'
  return v
}

/** Valida o formulário. `nova` exige parcelas e vencimento; na edição só os dados descritivos. */
export function validarDivida(f: CamposDivida, nova: boolean):
  | { ok: true; nova: NovaDivida; edicao: Parameters<typeof import('./repository').atualizarDivida>[1] }
  | { ok: false; erros: ErrosDivida } {
  const erros: ErrosDivida = {}
  if (!f.nome.trim()) erros.nome = 'Informe o nome.'
  const taxa = pct(f.taxa, 'taxa', erros)
  const taxa_anual = pct(f.taxa_anual, 'taxa_anual', erros)
  const cet = pct(f.cet, 'cet', erros)
  const contratado = f.contratado.trim() ? paraCentavos(f.contratado) : null
  if (f.contratado.trim() && !(contratado && contratado > 0)) erros.contratado = 'Valor inválido.'
  if (f.data_contratacao && !dataValida(f.data_contratacao)) erros.data_contratacao = 'Data inválida.'

  const n = Number(f.parcelas)
  const pagas = f.parcelas_pagas.trim() ? Number(f.parcelas_pagas) : 0
  const parcela = paraCentavos(f.valor_parcela)
  const total = paraCentavos(f.total)
  if (nova) {
    if (!(Number.isInteger(n) && n >= 1 && n <= 600)) erros.parcelas = 'De 1 a 600.'
    if (f.modo === 'PARCELA' && !(parcela && parcela > 0)) erros.valor_parcela = 'Informe o valor da parcela.'
    if (f.modo === 'TOTAL' && !(total && total > 0)) erros.total = 'Informe o total a pagar.'
    if (!(Number.isInteger(pagas) && pagas >= 0 && pagas <= n)) erros.parcelas_pagas = 'Entre 0 e o nº de parcelas.'
    if (!dataValida(f.primeiro)) erros.primeiro = 'Data inválida.'
  }
  if (Object.keys(erros).length) return { ok: false, erros }

  const detalhes = {
    tipo: (f.tipo || null) as TipoDivida | null,
    valor_contratado: contratado,
    taxa_anual,
    cet_anual: cet,
    sistema: (f.sistema || null) as SistemaAmortizacao | null,
    data_contratacao: f.data_contratacao || null,
    observacao: f.observacao.trim() || null,
  }
  const base = { nome: f.nome.trim(), credor: f.credor.trim() || null, taxa_mensal: taxa }
  return {
    ok: true,
    nova: {
      ...base, ...detalhes,
      total: f.modo === 'TOTAL' ? total ?? 0 : (parcela ?? 0) * n,
      valorParcela: f.modo === 'PARCELA' ? parcela : null,
      parcelas: n, parcelasPagas: pagas, primeiroVencimento: f.primeiro,
      categoria_id: f.categoria_id ? Number(f.categoria_id) : null,
    },
    edicao: { ...base, ...detalhes, status: f.status },
  }
}
