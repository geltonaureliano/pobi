import type { Centavos } from '../../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, type Competencia, type DataISO } from '../../shared/data'
import type { ContaComSaldo } from '../conta/model'
import type { CustoFixo } from '../custo-fixo/model'
import { situacaoDosCustos } from '../custo-fixo/rules'
import type { Parcela } from '../divida/model'
import { parcelasAtrasadas, saldoDevedor } from '../divida/rules'
import type { LancamentoDetalhado } from '../lancamento/model'
import { confirmado, despesaPorCategoria, totaisDaCompetencia } from '../lancamento/rules'
import type { Receita } from '../receita/model'
import { totalPrevisto } from '../receita/rules'
import type { Categoria } from '../categoria/model'

export type Faixa = 'Excelente' | 'Bom' | 'Atenção' | 'Crítico' | 'Alerta'

export interface ComponenteScore {
  nome: string
  pontos: number
  maximo: number
  explicacao: string
}

export interface RelatorioMensal {
  competencia: Competencia
  receitas: Centavos
  despesas: Centavos
  sobra: Centavos
  receitaPrevista: Centavos
  /** Base de renda: o maior entre recebido e previsto, para um salário atrasado não distorcer o mês. */
  rendaBase: Centavos
  custosFixos: Centavos
  parcelasDoMes: Centavos
  compromissos: Centavos
  comprometimento: number | null
  taxaPoupanca: number | null
  essenciais: Centavos
  naoEssenciais: Centavos
  fontesDeRenda: { nome: string; valor: Centavos }[]
  saldoDevedor: Centavos
  parcelasAtrasadas: number
  reserva: { valor: Centavos; despesaMedia: Centavos; meses: number | null; meta: number; mesesParaMeta: number | null }
  score: { total: number; faixa: Faixa; componentes: ComponenteScore[] }
  alertas: string[]
}

const lin = (v: number, de: number, ate: number) => Math.max(0, Math.min(1, (v - de) / (ate - de)))

export const faixaDoScore = (s: number): Faixa => (s >= 80 ? 'Excelente' : s >= 60 ? 'Bom' : s >= 40 ? 'Atenção' : s >= 20 ? 'Crítico' : 'Alerta')

export interface EntradaRelatorio {
  competencia: Competencia
  hoje: DataISO
  lancamentos: LancamentoDetalhado[]
  contas: ContaComSaldo[]
  categorias: Categoria[]
  receitas: Receita[]
  custosFixos: CustoFixo[]
  parcelas: Parcela[]
}

export function relatorioMensal(e: EntradaRelatorio): RelatorioMensal {
  const c = e.competencia
  const t = totaisDaCompetencia(e.lancamentos, c)
  const prevista = totalPrevisto(e.receitas, c)
  const rendaBase = Math.max(t.receitas, prevista)
  const custos = situacaoDosCustos(e.custosFixos, e.lancamentos, c).reduce((s, x) => s + x.custo.valor, 0)
  const parcelasDoMes = e.parcelas.filter((p) => p.vencimento.startsWith(c)).reduce((s, p) => s + p.valor, 0)
  const compromissos = custos + parcelasDoMes
  const comprometimento = rendaBase > 0 ? compromissos / rendaBase : null
  const taxaPoupanca = t.receitas > 0 ? t.resultado / t.receitas : null

  const essencial = new Set(e.categorias.filter((k) => k.essencial).map((k) => k.id))
  const porCategoria = despesaPorCategoria(e.lancamentos, c)
  const essenciais = porCategoria.filter((f) => f.categoria_id != null && essencial.has(f.categoria_id)).reduce((s, f) => s + f.valor, 0)

  const fontes = new Map<string, Centavos>()
  for (const l of e.lancamentos) {
    if (l.tipo !== 'RECEITA' || !confirmado(l) || competenciaDe(l.data) !== c) continue
    const k = l.categoria_nome ?? l.descricao
    fontes.set(k, (fontes.get(k) ?? 0) + l.valor)
  }
  const fontesDeRenda = [...fontes].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor)

  const devedor = saldoDevedor(e.parcelas)
  const atrasadas = parcelasAtrasadas(e.parcelas, e.hoje).length

  // Reserva: saldo em poupança/investimento ÷ despesa média dos 3 meses anteriores.
  const reservaValor = e.contas.filter((x) => !x.arquivada && (x.tipo === 'POUPANCA' || x.tipo === 'INVESTIMENTO')).reduce((s, x) => s + x.saldo, 0)
  const anteriores = [1, 2, 3].map((d) => totaisDaCompetencia(e.lancamentos, deslocarCompetencia(c, -d)).despesas).filter((v) => v > 0)
  const despesaMedia = anteriores.length ? Math.round(anteriores.reduce((a, b) => a + b, 0) / anteriores.length) : t.despesas
  const meta = 6
  const mesesReserva = despesaMedia > 0 ? reservaValor / despesaMedia : null
  const falta = despesaMedia * meta - reservaValor
  const mesesParaMeta = falta <= 0 ? 0 : t.resultado > 0 ? Math.ceil(falta / t.resultado) : null

  // Score 0–100 (mesma composição do quibo): poupança 40, comprometimento 30, dívidas 20, diversificação 10.
  const pPoupanca = taxaPoupanca == null ? 0 : Math.round(40 * lin(taxaPoupanca, 0, 0.2))
  const pCompromet = comprometimento == null ? 0 : Math.round(30 * (1 - lin(comprometimento, 0.3, 0.9)))
  const relDivida = rendaBase > 0 ? devedor / rendaBase : devedor > 0 ? Infinity : 0
  const pDividas = Math.max(0, Math.round(20 * (1 - lin(relDivida, 0, 12))) - (atrasadas > 0 ? 10 : 0))
  const pDivers = fontesDeRenda.length >= 2 ? 10 : fontesDeRenda.length === 1 ? 5 : 0
  const total = pPoupanca + pCompromet + pDividas + pDivers

  const alertas: string[] = []
  if (t.resultado < 0) alertas.push('Você gastou mais do que recebeu neste mês.')
  if (comprometimento != null && comprometimento > 0.5) alertas.push('Mais da metade da renda está presa em custos fixos e parcelas.')
  if (atrasadas > 0) alertas.push(`${atrasadas} parcela(s) de dívida em atraso.`)
  if (rendaBase === 0) alertas.push('Nenhuma receita recebida ou prevista neste mês.')

  return {
    competencia: c, receitas: t.receitas, despesas: t.despesas, sobra: t.resultado, receitaPrevista: prevista, rendaBase,
    custosFixos: custos, parcelasDoMes, compromissos, comprometimento, taxaPoupanca,
    essenciais, naoEssenciais: t.despesas - essenciais, fontesDeRenda,
    saldoDevedor: devedor, parcelasAtrasadas: atrasadas,
    reserva: { valor: reservaValor, despesaMedia, meses: mesesReserva, meta, mesesParaMeta },
    score: {
      total, faixa: faixaDoScore(total),
      componentes: [
        { nome: 'Poupança', pontos: pPoupanca, maximo: 40, explicacao: 'Cheio a partir de 20% da receita guardada.' },
        { nome: 'Comprometimento', pontos: pCompromet, maximo: 30, explicacao: 'Cheio com custos fixos e parcelas até 30% da renda; zera em 90%.' },
        { nome: 'Dívidas', pontos: pDividas, maximo: 20, explicacao: 'Cai conforme o saldo devedor se aproxima de 12 rendas; −10 com parcela atrasada.' },
        { nome: 'Fontes de renda', pontos: pDivers, maximo: 10, explicacao: 'Uma fonte vale 5, duas ou mais valem 10.' },
      ],
    },
    alertas,
  }
}

export interface MesDoAno {
  competencia: Competencia
  receitas: Centavos
  despesas: Centavos
  saldo: Centavos
  acumulado: Centavos
}

export function serieAnual(lancamentos: LancamentoDetalhado[], ano: number) {
  let acumulado = 0
  const meses: MesDoAno[] = Array.from({ length: 12 }, (_, i) => {
    const c = `${ano}-${String(i + 1).padStart(2, '0')}`
    const t = totaisDaCompetencia(lancamentos, c)
    acumulado += t.resultado
    return { competencia: c, receitas: t.receitas, despesas: t.despesas, saldo: t.resultado, acumulado }
  })
  const receitas = meses.reduce((s, m) => s + m.receitas, 0)
  const despesas = meses.reduce((s, m) => s + m.despesas, 0)
  const comDados = meses.filter((m) => m.receitas || m.despesas).length
  return {
    meses,
    receitas, despesas, saldo: receitas - despesas,
    mediaReceitas: comDados ? Math.round(receitas / comDados) : 0,
    mediaDespesas: comDados ? Math.round(despesas / comDados) : 0,
    taxaPoupanca: receitas > 0 ? (receitas - despesas) / receitas : null,
    mesesComDados: comDados,
  }
}

/** Gasto por categoria em cada mês do ano, para a tabela de evolução. */
export function categoriasNoAno(lancamentos: LancamentoDetalhado[], ano: number) {
  const linhas = new Map<string, Centavos[]>()
  for (let i = 0; i < 12; i++) {
    const c = `${ano}-${String(i + 1).padStart(2, '0')}`
    for (const f of despesaPorCategoria(lancamentos, c)) {
      const arr = linhas.get(f.nome) ?? Array(12).fill(0)
      arr[i] = f.valor
      linhas.set(f.nome, arr)
    }
  }
  return [...linhas].map(([nome, valores]) => ({ nome, valores, total: valores.reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total)
}
