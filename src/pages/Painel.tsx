import { useMemo, useState } from 'react'
import { formatarBRL, formatarPct } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../shared/data'
import { saldoTotal } from '../domain/conta/rules'
import { despesaPorCategoria } from '../domain/lancamento/rules'
import { heatmapDeGastos, metricasDoMes } from '../domain/painel/rules'
import { MetricCard } from '../ui/components/MetricCard'
import { Heatmap } from '../ui/components/Heatmap'
import { Barra } from '../ui/components/Barra'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

const JANELAS = { '3M': 3, '6M': 6, '9M': 9 } as const

export function Painel({ dados, ir }: { dados: Dados; ir: (p: 'relatorio' | 'anual' | 'lancamentos') => void }) {
  const c = competenciaDe(hoje())
  const [janela, setJanela] = useState<keyof typeof JANELAS>('9M')

  const m = useMemo(() => metricasDoMes(dados.lancamentos, c), [dados, c])
  const heat = useMemo(
    () => heatmapDeGastos(dados.lancamentos, `${deslocarCompetencia(c, -(JANELAS[janela] - 1))}-01`, hoje()),
    [dados, c, janela],
  )
  const categorias = useMemo(() => despesaPorCategoria(dados.lancamentos, c), [dados, c])
  const contas = dados.contas.filter((x) => !x.arquivada).sort((a, b) => b.saldo - a.saldo)
  const positivo = contas.reduce((s, x) => s + Math.max(x.saldo, 0), 0)

  // Despesa subir é ruim; receita subir é bom.
  const badge = (v: number | null, inverso = false) =>
    v == null ? undefined : { texto: formatarPct(v, true), tom: (v >= 0) !== inverso ? ('bom' as const) : ('ruim' as const) }
  const br = badge(m.receitas.variacao)
  const bd = badge(m.despesas.variacao, true)
  const tp = m.taxaPoupanca

  return (
    <>
      <div className="topo">
        <h1>Dashboard · {rotuloCompetencia(c)}</h1>
        <div className="acoes">
          <button className="botao secundario" onClick={() => ir('relatorio')}>Relatório mensal</button>
          <button className="botao secundario" onClick={() => ir('anual')}>Análise anual</button>
        </div>
      </div>
      <div className="cards">
        <MetricCard titulo="Saldo total" valor={<Dinheiro valor={saldoTotal(dados.contas)} animar />} badge={`${dados.contas.filter((x) => !x.arquivada).length} contas ativas`} tom="neutro" />
        <MetricCard titulo="Receitas do mês" valor={<Dinheiro valor={m.receitas.valor} animar />} badge={br?.texto} tom={br?.tom} />
        <MetricCard titulo="Despesas do mês" valor={<Dinheiro valor={m.despesas.valor} animar />} badge={bd?.texto} tom={bd?.tom} />
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
          <div className="secao-topo"><h3>Saldo por conta</h3><span className="sutil"><Dinheiro valor={saldoTotal(dados.contas)} /></span></div>
          {contas.length === 0 && <p className="sutil">Nenhuma conta cadastrada.</p>}
          {contas.map((x) => (
            <Barra key={x.id} rotulo={x.nome} direita={formatarBRL(x.saldo)} fracao={positivo ? Math.max(x.saldo, 0) / positivo : 0} estourada={x.saldo < 0} />
          ))}
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Maiores categorias</h3><span className="sutil"><Dinheiro valor={m.despesas.valor as number} /></span></div>
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
