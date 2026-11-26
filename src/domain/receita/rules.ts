import { competenciaDe, dataNoMes, deslocarCompetencia, diasNoMes, type Competencia, type DataISO } from '../../shared/data'
import type { Centavos } from '../../shared/dinheiro'
import { diasUteis } from '../../shared/feriados'
import type { AjusteReceitaMes, Receita } from './model'

export interface Vigente {
  valor: Centavos
  inicio: string
  fim: string | null
  ativa?: 0 | 1
  ativo?: 0 | 1
}

/** Pausado manualmente (ativa/ativo = 0) não conta, mesmo dentro da vigência. */
const pausado = (r: Vigente) => r.ativa === 0 || r.ativo === 0

/** Ativa se a vigência cruza a competência. */
export function ativaNaCompetencia(r: Vigente | Pick<Vigente, 'inicio' | 'fim'>, c: Competencia) {
  if ('valor' in r && pausado(r)) return false
  const primeiro = `${c}-01`
  const ultimo = dataNoMes(c, diasNoMes(c))
  return r.inicio <= ultimo && (r.fim == null || r.fim >= primeiro)
}

type ReceitaCalculavel = Vigente & Partial<Pick<Receita, 'id' | 'regra' | 'tipo_valor' | 'valor_min' | 'valor_max' | 'valor_hora' | 'horas_dia' | 'desconto_pct' | 'defasagem_meses' | 'dia_recebimento'>>

export interface PrevisaoReceita {
  valor: Centavos
  regra: 'FIXA' | 'VARIAVEL' | 'HORAS' | 'AVULSA'
  /** Data prevista do dinheiro cair (dia do recebimento ou último dia do mês). */
  data: DataISO
  ajustado: boolean
  faixa?: { min: Centavos | null; max: Centavos | null }
  /** Só HORAS: de onde veio o número. */
  horas?: { referencia: Competencia; dias: number; diasCalendario: number; feriados: string[]; horas: number; bruto: Centavos; desconto: Centavos; descontoPct: number }
}

/**
 * Quanto a receita deve render na competência `c`.
 * - FIXA: o valor cadastrado.
 * - VARIAVEL: a média cadastrada (com a faixa de mínimo e máximo, se houver).
 * - AVULSA: cai uma vez só, no mês e dia de `inicio`.
 * - HORAS: dias úteis do mês trabalhado (c − defasagem) × horas/dia × valor da hora, menos o desconto %.
 * Um ajuste do mês troca os dias trabalhados ou fixa o valor.
 */
export function previsaoDaReceita(r: ReceitaCalculavel, c: Competencia, ajuste?: Pick<AjusteReceitaMes, 'dias' | 'valor'> | null): PrevisaoReceita | null {
  if (pausado(r) || !ativaNaCompetencia(r, c)) return null
  const regra = r.regra ?? (r.tipo_valor === 'VARIAVEL' ? 'VARIAVEL' : 'FIXA')
  if (regra === 'AVULSA') {
    if (competenciaDe(r.inicio) !== c) return null
    return { valor: ajuste?.valor ?? r.valor, regra, data: r.inicio, ajustado: ajuste?.valor != null }
  }
  const data = r.dia_recebimento ? dataNoMes(c, r.dia_recebimento) : dataNoMes(c, diasNoMes(c))
  if (regra === 'HORAS' && r.valor_hora && r.horas_dia) {
    const referencia = deslocarCompetencia(c, -(r.defasagem_meses ?? 1))
    const uteis = diasUteis(referencia)
    const dias = ajuste?.dias ?? uteis.dias
    const horas = dias * r.horas_dia
    const bruto = Math.round(horas * r.valor_hora)
    const pct = r.desconto_pct ?? 0
    const desconto = Math.round(bruto * pct / 100)
    return {
      valor: ajuste?.valor ?? bruto - desconto, regra, data, ajustado: ajuste?.valor != null || ajuste?.dias != null,
      horas: { referencia, dias, diasCalendario: uteis.dias, feriados: uteis.feriados.map((f) => f.nome), horas, bruto, desconto, descontoPct: pct },
    }
  }
  return {
    valor: ajuste?.valor ?? r.valor, regra: regra === 'HORAS' ? 'FIXA' : regra, data, ajustado: ajuste?.valor != null,
    ...(regra === 'VARIAVEL' ? { faixa: { min: r.valor_min ?? null, max: r.valor_max ?? null } } : {}),
  }
}

const ajusteDe = (ajustes: AjusteReceitaMes[], id: number | undefined, c: Competencia) =>
  id == null ? null : ajustes.find((a) => a.receita_id === id && a.competencia === c) ?? null

/** Soma do que se espera receber na competência. */
export const totalPrevisto = (itens: ReceitaCalculavel[], c: Competencia, ajustes: AjusteReceitaMes[] = []) =>
  itens.reduce((s, i) => s + (previsaoDaReceita(i, c, ajusteDe(ajustes, i.id, c))?.valor ?? 0), 0)

/** Previsão de cada receita no mês, na ordem da data em que cai. */
export function previsoesDoMes(receitas: Receita[], c: Competencia, ajustes: AjusteReceitaMes[] = []) {
  return receitas
    .map((r) => ({ receita: r, previsao: previsaoDaReceita(r, c, ajusteDe(ajustes, r.id, c)), ajuste: ajusteDe(ajustes, r.id, c) }))
    .filter((x): x is { receita: Receita; previsao: PrevisaoReceita; ajuste: AjusteReceitaMes | null } => x.previsao != null)
    .sort((a, b) => a.previsao.data.localeCompare(b.previsao.data) || b.previsao.valor - a.previsao.valor)
}
