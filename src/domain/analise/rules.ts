import type { Centavos } from '../../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, type Competencia, type DataISO } from '../../shared/data'
import type { Categoria } from '../categoria/model'
import type { ContaComSaldo } from '../conta/model'
import { saldoTotal } from '../conta/rules'
import type { CustoFixo } from '../custo-fixo/model'
import { situacaoDosCustos } from '../custo-fixo/rules'
import type { Divida, Parcela } from '../divida/model'
import type { Cartao, FaturaInformada } from '../cartao/model'
import { emAbertoNoCartao, faturaDaCompra, resumoDaFatura } from '../cartao/rules'
import { fluxoDoMes, planoDoMes, saldoDoMes } from '../planejamento/rules'
import { parcelasAtrasadas, proximasParcelas, saldoDevedor } from '../divida/rules'
import type { LancamentoDetalhado } from '../lancamento/model'
import { confirmado, despesaPorCategoria, totaisDaCompetencia } from '../lancamento/rules'
import type { Orcamento } from '../orcamento/model'
import type { AjusteReceitaMes, Receita } from '../receita/model'
import { totalPrevisto } from '../receita/rules'
import type { Insight, ResultadoAnalise, ResumoFinanceiro } from './model'
import { relatorioMensal } from '../relatorio/rules'

const reais = (c: Centavos) => Math.round(c) / 100

export interface EntradaResumo {
  competencia: Competencia
  hoje: DataISO
  lancamentos: LancamentoDetalhado[]
  contas: ContaComSaldo[]
  categorias: Categoria[]
  orcamentos: (Orcamento & { categoria_nome: string })[]
  receitas: Receita[]
  receitasMes?: AjusteReceitaMes[]
  custosFixos: CustoFixo[]
  parcelas: Parcela[]
  /** Para o plano do mês (opcional nos testes antigos). */
  cartoes?: Cartao[]
  faturas?: FaturaInformada[]
  dividas?: Divida[]
}

/** Agrega os dados do mês e dos 2 anteriores. Valores em reais (não centavos) para a IA. */
export function montarResumo(e: EntradaResumo): ResumoFinanceiro {
  const c = e.competencia
  const anterior = deslocarCompetencia(c, -1)
  const essencial = new Map(e.categorias.map((k) => [k.nome, !!k.essencial]))
  const atual = despesaPorCategoria(e.lancamentos, c)
  const ant = despesaPorCategoria(e.lancamentos, anterior)
  const custos = situacaoDosCustos(e.custosFixos, e.lancamentos, c)
  const em30 = new Date(`${e.hoje}T00:00:00Z`)
  em30.setUTCDate(em30.getUTCDate() + 30)

  const rel = relatorioMensal(e)
  const ep = { ...e, cartoes: e.cartoes ?? [], faturas: e.faturas ?? [], dividas: e.dividas ?? [] }
  const pl = planoDoMes(ep, c)
  const fl = fluxoDoMes(pl, 0)
  const sd = saldoDoMes(pl, e.hoje)
  const arred = (v: number | null) => (v == null ? null : Math.round(v * 1000) / 1000)
  const plano = {
    receitas: reais(pl.entradas), despesas: reais(pl.saidas), saldoDoMes: reais(pl.livre), saldoAteHoje: reais(sd.ateHoje),
    comprometimento: arred(pl.comprometimento), menorSaldoNoMes: { valor: reais(fl.menor.valor), data: fl.menor.data },
    fontes: pl.porFonte.map((f) => ({ nome: f.nome, valor: reais(f.valor), regra: f.regra })),
    despesasPorTipo: { custosFixos: reais(pl.custos), faturas: reais(pl.faturas), parcelas: reais(pl.parcelas) },
    despesasPorCategoria: pl.porCategoria.map((k) => ({ nome: k.nome, valor: reais(k.valor) })),
    proximosMeses: [1, 2, 3, 4, 5, 6].map((d) => {
      const x = planoDoMes(ep, deslocarCompetencia(c, d))
      return { competencia: x.competencia, receitas: reais(x.entradas), despesas: reais(x.saidas), saldo: reais(x.livre) }
    }),
    cartoes: ep.cartoes.filter((k) => !k.arquivado).map((k) => {
      const f0 = faturaDaCompra(k, e.hoje)
      return {
        nome: k.nome, limite: reais(k.limite), emAberto: reais(emAbertoNoCartao(k, e.lancamentos, ep.faturas)),
        proximasFaturas: [0, 1, 2, 3, 4, 5].map((d) => resumoDaFatura(k, e.lancamentos, deslocarCompetencia(f0, d), ep.faturas)).filter((f) => f.total > 0).map((f) => ({ mes: f.fatura, valor: reais(f.total) })),
      }
    }),
    dividas: ep.dividas.filter((d) => d.status !== 'QUITADA').map((d) => {
      const ps = e.parcelas.filter((p) => p.divida_id === d.id)
      const abertas = ps.filter((p) => !p.pago_em)
      return { nome: d.nome, saldoDevedor: reais(saldoDevedor(ps)), parcela: abertas[0] ? reais(abertas[0].valor) : null, restantes: abertas.length, taxaMensal: d.taxa_mensal }
    }),
  }
  return {
    plano,
    competencia: c,
    moeda: 'BRL',
    saude: {
      score: rel.score.total, faixa: rel.score.faixa, comprometimento: arred(rel.comprometimento), taxaPoupanca: arred(rel.taxaPoupanca),
      reservaEmMeses: rel.reserva.meses == null ? null : Math.round(rel.reserva.meses * 10) / 10,
      essenciais: reais(rel.essenciais), naoEssenciais: reais(rel.naoEssenciais),
    },
    meses: [-2, -1, 0].map((d) => {
      const k = deslocarCompetencia(c, d)
      const t = totaisDaCompetencia(e.lancamentos, k)
      return { competencia: k, receitas: reais(t.receitas), despesas: reais(t.despesas) }
    }),
    saldoContas: reais(saldoTotal(e.contas)),
    categorias: atual.map((f) => ({
      nome: f.nome,
      essencial: essencial.get(f.nome) ?? false,
      valor: reais(f.valor),
      mesAnterior: reais(ant.find((a) => a.categoria_id === f.categoria_id)?.valor ?? 0),
    })),
    orcamentos: e.orcamentos
      .filter((o) => o.competencia === c)
      .map((o) => ({
        categoria: o.categoria_nome,
        limite: reais(o.limite),
        gasto: reais(atual.find((f) => f.categoria_id === o.categoria_id)?.valor ?? 0),
      })),
    receitaPrevista: reais(totalPrevisto(e.receitas, c, e.receitasMes)),
    custosFixos: {
      total: reais(custos.reduce((s, x) => s + x.custo.valor, 0)),
      pagos: custos.filter((x) => x.pago).length,
      emAberto: custos.filter((x) => !x.pago).length,
    },
    dividas: {
      saldoDevedor: reais(saldoDevedor(e.parcelas)),
      parcelasAtrasadas: parcelasAtrasadas(e.parcelas, e.hoje).length,
      proximos30dias: reais(
        proximasParcelas(e.parcelas, e.hoje, em30.toISOString().slice(0, 10)).reduce((s, p) => s + p.valor, 0),
      ),
    },
    maioresGastos: e.lancamentos
      .filter((l) => l.tipo === 'DESPESA' && confirmado(l) && competenciaDe(l.data) === c)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
      .map((l) => ({ descricao: l.descricao, categoria: l.categoria_nome ?? 'Sem categoria', valor: reais(l.valor) })),
  }
}

export function montarPrompt(r: ResumoFinanceiro): string {
  return `Você é um analista de finanças pessoais. Analise o resumo abaixo (valores em reais, mês ${r.competencia}).

Como o app conta o mês (use isto como base principal, em "plano"):
- Receitas = tudo que está cadastrado em Receitas (fixas, variáveis pela média, por hora pelos dias úteis, avulsas só no mês delas).
- Despesas = custos fixos (custo de vida) + faturas de cartão que vencem no mês + parcelas de dívidas do mês.
- Saldo do mês = receitas − despesas. "saldoAteHoje" considera só o que já caiu/venceu até hoje; "menorSaldoNoMes" é o ponto mais baixo do mês.
- "proximosMeses" é a projeção dos 6 meses seguintes pela mesma regra; "cartoes" traz as próximas faturas; "dividas" o saldo e o ritmo de pagamento.
- Os campos fora de "plano" (meses, categorias, maioresGastos) vêm de lançamentos registrados e podem estar vazios.

Regras:
- Use somente os números do resumo. Não invente valores nem suponha juros.
- Procure: meses que vão ficar no vermelho, concentração de renda numa fonte, faturas que pesam demais, dívidas caras (taxa alta) para quitar antes, folga para reserva.
- Cada insight precisa citar em "evidencia" o número do resumo que o sustenta.
- Categorias com "essencial": true não devem ser tratadas como corte fácil.
- Se faltar informação para concluir algo, coloque em "pontosCegos".
- Escreva em português do Brasil, frases curtas e diretas.

Responda APENAS com um JSON válido, sem markdown, neste formato:
{"manchete": string, "resumo": string,
 "insights": [{"titulo": string, "detalhe": string, "severidade": "atencao"|"oportunidade"|"positivo", "evidencia": string}],
 "plano": [{"acao": string, "porque": string, "prazo": "semana"|"mes"}],
 "pontosCegos": [string]}

Resumo:
${JSON.stringify(r, null, 2)}`
}

const SEVERIDADES = ['atencao', 'oportunidade', 'positivo']
const texto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0

/** Extrai e valida o JSON da resposta do CLI. Lança erro com mensagem legível se vier fora do formato. */
export function interpretarResposta(saida: string): ResultadoAnalise {
  const ini = saida.indexOf('{')
  const fim = saida.lastIndexOf('}')
  if (ini < 0 || fim <= ini) throw new Error('A IA não devolveu um JSON.')
  let j: Record<string, unknown>
  try {
    j = JSON.parse(saida.slice(ini, fim + 1))
  } catch {
    throw new Error('A IA devolveu um JSON inválido.')
  }
  if (!texto(j.manchete) || !texto(j.resumo)) throw new Error('Resposta sem manchete ou resumo.')
  const insights = Array.isArray(j.insights) ? j.insights : []
  const plano = Array.isArray(j.plano) ? j.plano : []
  return {
    manchete: j.manchete,
    resumo: j.resumo,
    insights: insights
      .filter((i): i is Insight => texto(i?.titulo) && texto(i?.detalhe) && SEVERIDADES.includes(i?.severidade))
      .map((i) => ({ titulo: i.titulo, detalhe: i.detalhe, severidade: i.severidade, evidencia: texto(i.evidencia) ? i.evidencia : '' })),
    plano: plano
      .filter((p) => texto(p?.acao))
      .map((p) => ({ acao: p.acao, porque: texto(p.porque) ? p.porque : '', prazo: p.prazo === 'semana' ? 'semana' : 'mes' })),
    pontosCegos: (Array.isArray(j.pontosCegos) ? j.pontosCegos : []).filter(texto),
  }
}

/** Impressão digital do resumo: análises com a mesma impressão reutilizam o resultado salvo. */
export async function impressao(r: ResumoFinanceiro): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(r))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
