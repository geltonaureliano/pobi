import { centavosParaTexto, paraCentavos, pctParaTexto, textoParaNumero } from '../../shared/dinheiro'
import { competenciaDe, hoje } from '../../shared/data'
import { validarRecorrente, type CamposRecorrente } from '../../shared/recorrente'
import type { NovaReceita, Receita, RegraReceita } from './model'
import { previsaoDaReceita } from './rules'

/** Formulário de receita: os campos de item recorrente mais a regra de cálculo. */
export interface CamposReceita extends CamposRecorrente {
  regra: RegraReceita
  valor_min: string
  valor_max: string
  fonte: string
  valor_hora: string
  horas_dia: string
  desconto_pct: string
  defasagem: string
}

export type ErrosReceita = Partial<Record<keyof CamposReceita, string>>

export const receitaVazia = (conta_id = ''): CamposReceita => ({
  nome: '', valor: '', dia: '', inicio: `${competenciaDe(hoje())}-01`, fim: '', conta_id, cartao_id: '', categoria_id: '', observacao: '',
  regra: 'FIXA', valor_min: '', valor_max: '', fonte: '', valor_hora: '', horas_dia: '8', desconto_pct: '', defasagem: '1',
})

export const camposDeReceita = (r: Receita): CamposReceita => ({
  nome: r.nome, valor: centavosParaTexto(r.valor), dia: r.dia_recebimento ? String(r.dia_recebimento) : '', inicio: r.inicio, fim: r.fim ?? '',
  conta_id: r.conta_id ? String(r.conta_id) : '', cartao_id: '', categoria_id: r.categoria_id ? String(r.categoria_id) : '', observacao: r.observacao ?? '',
  regra: r.regra ?? (r.tipo_valor === 'VARIAVEL' ? 'VARIAVEL' : 'FIXA'),
  valor_min: centavosParaTexto(r.valor_min), valor_max: centavosParaTexto(r.valor_max), fonte: r.fonte ?? '',
  valor_hora: centavosParaTexto(r.valor_hora), horas_dia: r.horas_dia != null ? pctParaTexto(r.horas_dia) : '8',
  desconto_pct: pctParaTexto(r.desconto_pct), defasagem: String(r.defasagem_meses ?? 1),
})

/** Parâmetros da regra por hora já convertidos, ou null se incompletos. */
export function parametrosPorHora(f: CamposReceita) {
  const valor_hora = paraCentavos(f.valor_hora)
  const horas_dia = textoParaNumero(f.horas_dia)
  const desconto_pct = textoParaNumero(f.desconto_pct) ?? 0
  const defasagem_meses = Number(f.defasagem || 1)
  if (!valor_hora || valor_hora <= 0 || !horas_dia || !(horas_dia > 0 && horas_dia <= 24) || !(desconto_pct >= 0 && desconto_pct < 100)) return null
  return { valor_hora, horas_dia, desconto_pct, defasagem_meses }
}

export function validarReceita(f: CamposReceita): { ok: true; valor: NovaReceita } | { ok: false; erros: ErrosReceita } {
  const horas = f.regra === 'HORAS'
  // Na regra por hora o "valor" é calculado: usa a previsão do mês atual como referência.
  const ph = horas ? parametrosPorHora(f) : null
  const ref = ph ? previsaoDaReceita({ valor: 1, inicio: '0000-01-01', fim: null, regra: 'HORAS', ...ph }, competenciaDe(hoje()))?.valor : null
  const base = validarRecorrente({ ...f, valor: horas ? centavosParaTexto(ref ?? 1) : f.valor }, false)
  const erros: ErrosReceita = base.ok ? {} : { ...base.erros }
  const variavel = f.regra === 'VARIAVEL'
  const min = variavel && f.valor_min.trim() ? paraCentavos(f.valor_min) : null
  const max = variavel && f.valor_max.trim() ? paraCentavos(f.valor_max) : null
  const valor = paraCentavos(f.valor)
  if (variavel && f.valor_min.trim() && !(min && min > 0)) erros.valor_min = 'Valor inválido.'
  if (variavel && f.valor_max.trim() && !(max && max > 0)) erros.valor_max = 'Valor inválido.'
  if (min && max && min > max) erros.valor_max = 'O máximo precisa ser maior que o mínimo.'
  if (min && valor && valor < min) erros.valor = 'A média ficou abaixo do mínimo.'
  if (max && valor && valor > max) erros.valor = 'A média ficou acima do máximo.'
  if (horas) {
    if (!(paraCentavos(f.valor_hora) ?? 0)) erros.valor_hora = 'Informe o valor da hora.'
    const h = textoParaNumero(f.horas_dia)
    if (!(h != null && h > 0 && h <= 24)) erros.horas_dia = 'Entre 0 e 24.'
    const d = textoParaNumero(f.desconto_pct)
    if (d != null && !(d >= 0 && d < 100)) erros.desconto_pct = 'De 0 a 99,99.'
    delete erros.valor
  }
  if (Object.keys(erros).length || !base.ok) return { ok: false, erros }
  const v = base.valor
  return {
    ok: true,
    valor: {
      nome: v.nome, valor: v.valor, dia_recebimento: v.dia, inicio: v.inicio, fim: v.fim, conta_id: v.conta_id, categoria_id: v.categoria_id,
      observacao: v.observacao, fonte: f.fonte.trim() || null,
      regra: f.regra, tipo_valor: f.regra === 'FIXA' ? 'FIXA' : 'VARIAVEL', valor_min: min, valor_max: max,
      valor_hora: ph?.valor_hora ?? null, horas_dia: ph?.horas_dia ?? null, desconto_pct: ph ? ph.desconto_pct : null, defasagem_meses: ph?.defasagem_meses ?? 1,
    },
  }
}
