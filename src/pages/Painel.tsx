import { useEffect, useMemo, useState } from 'react'
import { formatarBRL, formatarPct } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, diasNoMes, hoje, rotuloCompetencia } from '../shared/data'
import { saldoTotal } from '../domain/conta/rules'
import { despesaPorCategoria } from '../domain/lancamento/rules'
import { heatmapDeGastos, metricasDoMes } from '../domain/painel/rules'
import { listarOrcamentos } from '../domain/orcamento/repository'
import { progressoDosOrcamentos, ritmoEsperado } from '../domain/orcamento/rules'
import type { Orcamento } from '../domain/orcamento/model'
import { MetricCard } from '../ui/components/MetricCard'
import { Heatmap } from '../ui/components/Heatmap'
import { Barra } from '../ui/components/Barra'
import type { Dados } from '../ui/useDados'

const JANELAS = { '3M': 3, '6M': 6, '9M': 9 } as const

export function Painel({ dados, ir }: { dados: Dados; ir: (p: 'relatorio' | 'anual' | 'lancamentos') => void }) {
  const c = competenciaDe(hoje())
  const [janela, setJanela] = useState<keyof typeof JANELAS>('9M')
  const [orcamentos, setOrcamentos] = useState<(Orcamento & { categoria_nome: string })[]>([])
  useEffect(() => { listarOrcamentos(c).then(setOrcamentos) }, [c])

  const m = useMemo(() => metricasDoMes(dados.lancamentos, c), [dados, c])
  const heat = useMemo(
    () => heatmapDeGastos(dados.lancamentos, `${deslocarCompetencia(c, -(JANELAS[janela] - 1))}-01`, hoje()),
    [dados, c, janela],
  )
  const categorias = useMemo(() => despesaPorCategoria(dados.lancamentos, c), [dados, c])
  const progresso = progressoDosOrcamentos(orcamentos, categorias, c)
  const ritmo = ritmoEsperado(Number(hoje().slice(8)), diasNoMes(c))

  // Despesa subir é ruim; receita subir é bom.
  const badge = (v: number | null, inverso = false) =>
    v == null ? undefined : { texto: formatarPct(v, true), tom: (v >= 0) !== inverso ? ('bom' as const) : ('ruim' as const) }
  const br = badge(m.receitas.variacao)
  const bd = badge(m.despesas.variacao, true)
  const tp = m.taxaPoupanca

  return (
    <>
      <div className="topo">
        <h1>Painel · {rotuloCompetencia(c)}</h1>
        <div className="acoes">
          <button className="botao secundario" onClick={() => ir('relatorio')}>Relatório mensal</button>
          <button className="botao secundario" onClick={() => ir('anual')}>Análise anual</button>
        </div>
      </div>
      <div className="cards">
        <MetricCard titulo="Saldo total" valor={formatarBRL(saldoTotal(dados.contas))} badge={`${dados.contas.filter((x) => !x.arquivada).length} contas ativas`} tom="neutro" />
        <MetricCard titulo="Receitas do mês" valor={formatarBRL(m.receitas.valor)} badge={br?.texto} tom={br?.tom} />
        <MetricCard titulo="Despesas do mês" valor={formatarBRL(m.despesas.valor)} badge={bd?.texto} tom={bd?.tom} />
        <MetricCard
          titulo="Taxa de poupança"
          valor={tp.valor == null ? '—' : formatarPct(tp.valor)}
          badge={tp.valor == null ? 'Sem receita no mês' : tp.valor >= 0.2 ? 'Acima de 20%' : tp.valor >= 0 ? 'Abaixo de 20%' : 'Gastou mais do que ganhou'}
          tom={tp.valor == null ? 'neutro' : tp.valor >= 0.2 ? 'bom' : tp.valor >= 0 ? 'neutro' : 'ruim'}
        />
      </div>

      <div className="secao">
        <div className="secao-topo">
          <h3>Gastos por dia</h3>
          <div className="abas">
            {(Object.keys(JANELAS) as (keyof typeof JANELAS)[]).map((k) => (
              <button key={k} className={`aba ${janela === k ? 'ativa' : ''}`} onClick={() => setJanela(k)}>{k}</button>
            ))}
          </div>
        </div>
        <Heatmap colunas={heat} />
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo">
            <h3>Orçamentos</h3>
            <span className="sutil">ritmo esperado {formatarPct(ritmo)}</span>
          </div>
          {progresso.length === 0 && <p className="sutil">Nenhum orçamento para este mês.</p>}
          {progresso.map((p) => (
            <Barra
              key={p.orcamento.id}
              rotulo={`${p.orcamento.categoria_nome} · ${formatarBRL(p.gasto)}`}
              direita={p.estourado ? `estourou ${formatarBRL(-p.restante)}` : `${formatarPct(p.usado)} usado`}
              fracao={p.usado}
              estourada={p.estourado}
            />
          ))}
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Maiores categorias</h3><span className="sutil">{formatarBRL(m.despesas.valor as number)}</span></div>
          {categorias.slice(0, 6).map((f) => (
            <div className="ranking-item" key={String(f.categoria_id)}>
              <div className="ranking-icone">{f.nome.slice(0, 1)}</div>
              <Barra rotulo={f.nome} direita={`${formatarBRL(f.valor)} · ${formatarPct(f.participacao)}`} fracao={f.participacao} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
