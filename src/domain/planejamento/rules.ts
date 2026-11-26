import type { Centavos } from '../../shared/dinheiro'
import { dataNoMes, deslocarCompetencia, diasNoMes, type Competencia, type DataISO } from '../../shared/data'
import type { Cartao, FaturaInformada } from '../cartao/model'
import { faturaDaCompra, resumoDaFatura } from '../cartao/rules'
import type { Categoria } from '../categoria/model'
import type { ContaComSaldo } from '../conta/model'
import type { CustoFixo } from '../custo-fixo/model'
import { ativoNaCompetencia } from '../custo-fixo/rules'
import type { Divida, Parcela } from '../divida/model'
import type { LancamentoDetalhado } from '../lancamento/model'
import { totaisDaCompetencia } from '../lancamento/rules'
import type { Receita } from '../receita/model'
import { previsoesDoMes } from '../receita/rules'

/** Tudo que o planejamento precisa: o que se espera receber e pagar. */
export interface EntradaPlano {
  receitas: Receita[]
  custosFixos: CustoFixo[]
  cartoes: Cartao[]
  faturas: FaturaInformada[]
  dividas: Divida[]
  parcelas: Parcela[]
  lancamentos: LancamentoDetalhado[]
  categorias: Categoria[]
  contas: ContaComSaldo[]
}

export type TipoEvento = 'receita' | 'custo' | 'fatura' | 'parcela'

export interface EventoDoMes {
  data: DataISO
  tipo: TipoEvento
  nome: string
  detalhe: string | null
  valor: Centavos
  /** Positivo para entrada, negativo para saída. */
  efeito: Centavos
  categoria: string | null
  cor: string | null
  pago?: boolean
}

export interface PlanoDoMes {
  competencia: Competencia
  eventos: EventoDoMes[]
  entradas: Centavos
  custos: Centavos
  faturas: Centavos
  parcelas: Centavos
  saidas: Centavos
  livre: Centavos
  /** Saídas fixas (custos + parcelas + faturas) ÷ entradas. */
  comprometimento: number | null
  /** Livre ÷ entradas. */
  taxaLivre: number | null
  /** Lançamentos de fato registrados no mês (realizado). */
  realizado: { receitas: Centavos; despesas: Centavos; resultado: Centavos; temDados: boolean }
  porCategoria: { nome: string; valor: Centavos; cor: string | null }[]
  porFonte: { nome: string; valor: Centavos; regra: string }[]
}

/**
 * O mês previsto: receitas pela regra, custos fixos, faturas de cartão (informadas ou pelas compras)
 * e parcelas de dívida que vencem nele.
 * Custo fixo cobrado em cartão entra pela fatura: só é contado à parte quando a fatura daquele cartão
 * no mês não foi informada (senão já está dentro dela).
 */
export function planoDoMes(e: EntradaPlano, c: Competencia): PlanoDoMes {
  const cat = (id: number | null) => e.categorias.find((k) => k.id === id)
  const eventos: EventoDoMes[] = []

  const receitas = previsoesDoMes(e.receitas, c)
  for (const { receita: r, previsao: p } of receitas) {
    const det = p.horas ? `${p.horas.dias} dias úteis × ${String(r.horas_dia).replace('.', ',')}h` : p.regra === 'AVULSA' ? 'avulsa' : p.regra === 'VARIAVEL' ? 'média' : 'fixa'
    eventos.push({ data: p.data, tipo: 'receita', nome: r.nome, detalhe: det, valor: p.valor, efeito: p.valor, categoria: cat(r.categoria_id)?.nome ?? null, cor: cat(r.categoria_id)?.cor ?? null })
  }

  const cartoesAtivos = e.cartoes.filter((k) => !k.arquivado)
  const informadaNoMes = (cartaoId: number) => e.faturas.some((f) => f.cartao_id === cartaoId && f.competencia === c)
  for (const cf of e.custosFixos) {
    if (!cf.ativo || !ativoNaCompetencia(cf, c)) continue
    if (cf.cartao_id) {
      const k = cartoesAtivos.find((x) => x.id === cf.cartao_id)
      // No cartão: entra pela fatura do mês em que a cobrança cai.
      if (k && (informadaNoMes(k.id) || faturaDaCompra(k, dataNoMes(c, cf.dia_vencimento ?? 1)) !== c)) continue
    }
    const k = cat(cf.categoria_id)
    eventos.push({
      data: dataNoMes(c, cf.dia_vencimento ?? diasNoMes(c)), tipo: 'custo', nome: cf.nome, detalhe: cf.cartao_id ? 'no cartão' : null,
      valor: cf.valor, efeito: -cf.valor, categoria: k?.nome ?? 'Sem categoria', cor: k?.cor ?? null,
    })
  }

  for (const k of cartoesAtivos) {
    const f = resumoDaFatura(k, e.lancamentos, c, e.faturas)
    if (!f.total) continue
    eventos.push({
      data: f.vencimento, tipo: 'fatura', nome: `Fatura ${k.nome}`, detalhe: f.informado != null ? 'valor do app do banco' : 'compras lançadas',
      valor: f.total, efeito: -f.total, categoria: 'Cartão de crédito', cor: null, pago: f.situacao === 'paga',
    })
  }

  for (const p of e.parcelas) {
    if (!p.vencimento.startsWith(c)) continue
    const d = e.dividas.find((x) => x.id === p.divida_id)
    if (!d || d.status === 'QUITADA' && !p.pago_em) continue
    const total = e.parcelas.filter((x) => x.divida_id === p.divida_id).length
    eventos.push({
      data: p.vencimento, tipo: 'parcela', nome: d.nome, detalhe: `parcela ${p.numero}/${total}`, valor: p.valor, efeito: -p.valor,
      categoria: cat(d.categoria_id)?.nome ?? 'Dívidas', cor: cat(d.categoria_id)?.cor ?? null, pago: !!p.pago_em,
    })
  }

  eventos.sort((a, b) => a.data.localeCompare(b.data) || b.efeito - a.efeito)
  const soma = (t: TipoEvento) => eventos.filter((x) => x.tipo === t).reduce((s, x) => s + x.valor, 0)
  const entradas = soma('receita'), custos = soma('custo'), faturas = soma('fatura'), parcelas = soma('parcela')
  const saidas = custos + faturas + parcelas
  const t = totaisDaCompetencia(e.lancamentos, c)

  const porCategoria = new Map<string, { valor: number; cor: string | null }>()
  for (const ev of eventos) {
    if (ev.efeito >= 0) continue
    const nome = ev.categoria ?? 'Outros'
    const atual = porCategoria.get(nome) ?? { valor: 0, cor: ev.cor }
    atual.valor += ev.valor
    porCategoria.set(nome, atual)
  }

  return {
    competencia: c, eventos, entradas, custos, faturas, parcelas, saidas, livre: entradas - saidas,
    comprometimento: entradas > 0 ? saidas / entradas : null,
    taxaLivre: entradas > 0 ? (entradas - saidas) / entradas : null,
    realizado: { receitas: t.receitas, despesas: t.despesas, resultado: t.resultado, temDados: t.receitas > 0 || t.despesas > 0 },
    porCategoria: [...porCategoria].map(([nome, v]) => ({ nome, valor: v.valor, cor: v.cor })).sort((a, b) => b.valor - a.valor),
    porFonte: receitas.map(({ receita: r, previsao: p }) => ({ nome: r.nome, valor: p.valor, regra: p.horas ? 'HORAS' : p.regra })).sort((a, b) => b.valor - a.valor),
  }
}

/** Saldo dia a dia ao longo do mês, a partir de um saldo inicial, aplicando os eventos na data. */
export function fluxoDoMes(plano: PlanoDoMes, saldoInicial: Centavos) {
  const c = plano.competencia
  let saldo = saldoInicial
  let menor = { valor: saldoInicial, data: `${c}-01` }
  const dias = Array.from({ length: diasNoMes(c) }, (_, i) => {
    const data = `${c}-${String(i + 1).padStart(2, '0')}`
    const doDia = plano.eventos.filter((ev) => ev.data === data)
    saldo += doDia.reduce((s, ev) => s + ev.efeito, 0)
    if (saldo < menor.valor) menor = { valor: saldo, data }
    return { data, saldo, eventos: doDia }
  })
  return { dias, final: saldo, menor }
}

/** Plano de 12 meses a partir de `inicio`, com saldo projetado acumulando o livre de cada mês. */
export function planoDoAno(e: EntradaPlano, inicio: Competencia, saldoInicial: Centavos) {
  let acumulado = saldoInicial
  return Array.from({ length: 12 }, (_, i) => {
    const plano = planoDoMes(e, deslocarCompetencia(inicio, i))
    acumulado += plano.livre
    return { ...plano, saldoProjetado: acumulado }
  })
}

/**
 * Saldo do mês = receitas − despesas (custos fixos + faturas + parcelas), pela regra do app.
 * `ateHoje` conta só o que já caiu ou venceu até o dia; `fechamento` é o mês inteiro.
 */
export function saldoDoMes(plano: PlanoDoMes, hoje: DataISO) {
  const ate = plano.eventos.filter((e) => e.data <= hoje)
  const entrou = ate.filter((e) => e.efeito > 0).reduce((s, e) => s + e.efeito, 0)
  const saiu = -ate.filter((e) => e.efeito < 0).reduce((s, e) => s + e.efeito, 0)
  return {
    ateHoje: entrou - saiu, entrou, saiu,
    fechamento: plano.livre,
    aReceber: plano.entradas - entrou,
    aPagar: plano.saidas - saiu,
  }
}
