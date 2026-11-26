import { useMemo } from 'react'
import { formatarBRL, formatarPct, variacao } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia, rotuloMes } from '../shared/data'
import { planoDoMes, saldoDoMes, type EventoDoMes, type TipoEvento } from '../domain/planejamento/rules'
import { emAbertoNoCartao } from '../domain/cartao/rules'
import { BarrasPlano, COR_TIPO, Rosca } from '../ui/components/Graficos'
import { Barra } from '../ui/components/Barra'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

type Pagina = 'relatorio' | 'anual' | 'lancamentos' | 'receitas' | 'custos' | 'cartoes' | 'dividas'
const br = (d: string) => d.split('-').reverse().slice(0, 2).join('/')
const ROTULO: Record<TipoEvento, string> = { receita: 'receita', custo: 'custo fixo', fatura: 'fatura', parcela: 'parcela' }

/** Dashboard: o mês pela regra do app (receitas − custos fixos, faturas e parcelas), com o que já foi e o que falta. */
export function Painel({ dados, ir }: { dados: Dados; ir: (p: Pagina) => void }) {
  const c = competenciaDe(hoje())
  const plano = useMemo(() => planoDoMes(dados, c), [dados, c])
  const anterior = useMemo(() => planoDoMes(dados, deslocarCompetencia(c, -1)), [dados, c])
  const saldo = saldoDoMes(plano, hoje())
  const seis = useMemo(() => Array.from({ length: 6 }, (_, i) => planoDoMes(dados, deslocarCompetencia(c, i))), [dados, c])
  const proximos = plano.eventos.filter((e) => e.data >= hoje()).slice(0, 8)
  const jaForam = plano.eventos.filter((e) => e.data < hoje())
  const vR = variacao(plano.entradas, anterior.entradas)
  const vD = variacao(plano.saidas, anterior.saidas)
  const cartoes = dados.cartoes.filter((k) => !k.arquivado)
  const progresso = plano.saidas ? saldo.saiu / plano.saidas : 0

  const Linha = ({ e }: { e: EventoDoMes }) => (
    <div className={`evento ${e.data < hoje() ? 'passado' : ''}`}>
      <span className="evento-dia">{br(e.data)}</span>
      <span className={`evento-ponto ev-${e.tipo}`} />
      <div className="evento-nome"><strong>{e.nome}</strong><small>{ROTULO[e.tipo]}{e.detalhe ? ` · ${e.detalhe}` : ''}</small></div>
      <Dinheiro valor={e.efeito} sinal tom={e.efeito > 0 ? 'pos' : 'neutro'} />
    </div>
  )

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
        <div className="card card-link" onClick={() => ir('receitas')}><h3>Receitas do mês</h3>{vR != null ? <span className={`badge ${vR >= 0 ? 'bom' : 'ruim'}`}>{formatarPct(vR, true)} vs {rotuloMes(anterior.competencia).toLowerCase()}</span> : <span className="badge">{plano.porFonte.length} fontes</span>}<div className="valor pos"><Dinheiro valor={plano.entradas} animar tom="pos" /></div></div>
        <div className="card"><h3>Despesas do mês</h3>{vD != null ? <span className={`badge ${vD <= 0 ? 'bom' : 'ruim'}`}>{formatarPct(vD, true)} vs {rotuloMes(anterior.competencia).toLowerCase()}</span> : <span className="badge">fixos, faturas e parcelas</span>}<div className="valor"><Dinheiro valor={plano.saidas} animar /></div></div>
        <div className="card"><h3>Saldo hoje</h3><span className={`badge ${saldo.fechamento >= 0 ? 'bom' : 'ruim'}`}>fecha o mês em {formatarBRL(saldo.fechamento)}</span><div className="valor"><Dinheiro valor={saldo.ateHoje} animar tom="auto" /></div></div>
        <div className="card"><h3>Comprometimento</h3><span className={`badge ${plano.comprometimento == null ? '' : plano.comprometimento <= 0.5 ? 'bom' : plano.comprometimento > 0.8 ? 'ruim' : ''}`}>despesas ÷ receitas</span><div className="valor">{plano.comprometimento == null ? '—' : formatarPct(plano.comprometimento)}</div></div>
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>O mês até hoje</h3><span className="sutil">{jaForam.length} de {plano.eventos.length} itens já passaram</span></div>
        <div className="faixa-hoje">
          <div><span>Já entrou</span><strong><Dinheiro valor={saldo.entrou} tom="pos" /></strong></div>
          <div><span>Já saiu</span><strong><Dinheiro valor={saldo.saiu} /></strong></div>
          <div><span>Falta receber</span><strong><Dinheiro valor={saldo.aReceber} tom="pos" /></strong></div>
          <div><span>Falta pagar</span><strong><Dinheiro valor={saldo.aPagar} /></strong></div>
          <div><span>Fecha o mês com</span><strong><Dinheiro valor={saldo.fechamento} tom="auto" /></strong></div>
        </div>
        <Barra rotulo="Despesas do mês já pagas ou vencidas" direita={formatarPct(progresso)} fracao={progresso} />
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Despesas em detalhe</h3><span className="sutil"><Dinheiro valor={plano.saidas} /></span></div>
          <div className="despesas-tipos">
            <button onClick={() => ir('custos')}><b style={{ background: COR_TIPO.custo }} /><span>Custo de vida</span><strong><Dinheiro valor={plano.custos} /></strong><small>{plano.eventos.filter((e) => e.tipo === 'custo').length} custos fixos</small></button>
            <button onClick={() => ir('cartoes')}><b style={{ background: COR_TIPO.fatura }} /><span>Faturas de cartão</span><strong><Dinheiro valor={plano.faturas} /></strong><small>{plano.eventos.filter((e) => e.tipo === 'fatura').length} faturas no mês</small></button>
            <button onClick={() => ir('dividas')}><b style={{ background: COR_TIPO.parcela }} /><span>Parcelas de dívidas</span><strong><Dinheiro valor={plano.parcelas} /></strong><small>{plano.eventos.filter((e) => e.tipo === 'parcela').length} parcelas</small></button>
          </div>
          <Rosca
            centro={formatarBRL(plano.entradas)} sub="receitas"
            fatias={[
              { nome: 'Custo de vida', valor: plano.custos, cor: COR_TIPO.custo },
              { nome: 'Faturas', valor: plano.faturas, cor: COR_TIPO.fatura },
              { nome: 'Parcelas', valor: plano.parcelas, cor: COR_TIPO.parcela },
              { nome: plano.livre >= 0 ? 'Sobra' : 'Falta', valor: Math.abs(plano.livre), cor: plano.livre >= 0 ? COR_TIPO.livre : '#f0b3a8' },
            ]}
          />
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Próximos no mês</h3><span className="sutil">a partir de hoje</span></div>
          {proximos.length ? proximos.map((e, i) => <Linha key={i} e={e} />) : <p className="sutil">Nada mais previsto até o fim do mês.</p>}
          {jaForam.length > 0 && (
            <details className="ja-foram">
              <summary>Já passaram ({jaForam.length})</summary>
              {jaForam.map((e, i) => <Linha key={i} e={e} />)}
            </details>
          )}
        </div>
      </div>

      <div className="secao">
        <div className="secao-topo">
          <h3>Próximos 6 meses</h3>
          <div className="legenda-cores">
            <span><b style={{ background: COR_TIPO.receita }} />receitas</span><span><b style={{ background: COR_TIPO.custo }} />custos</span>
            <span><b style={{ background: COR_TIPO.fatura }} />faturas</span><span><b style={{ background: COR_TIPO.parcela }} />parcelas</span><span><i />saldo</span>
          </div>
        </div>
        <BarrasPlano meses={seis} selecionado={c} aoEscolher={() => ir('anual')} />
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Receitas por fonte</h3><span className="sutil"><Dinheiro valor={plano.entradas} /></span></div>
          {plano.porFonte.map((f) => <Barra key={f.nome} rotulo={f.nome} direita={`${formatarBRL(f.valor)} · ${formatarPct(plano.entradas ? f.valor / plano.entradas : 0)}`} fracao={plano.entradas ? f.valor / plano.entradas : 0} />)}
          {!plano.porFonte.length && <p className="sutil">Nenhuma receita prevista neste mês.</p>}
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Cartões</h3><button className="aba" onClick={() => ir('cartoes')}>ver cartões</button></div>
          {cartoes.map((k) => {
            const usado = emAbertoNoCartao(k, dados.lancamentos, dados.faturas)
            return <Barra key={k.id} rotulo={`${k.nome} · livre ${formatarBRL(k.limite - usado)}`} direita={`${formatarBRL(usado)} de ${formatarBRL(k.limite)}`} fracao={k.limite ? usado / k.limite : 0} estourada={usado > k.limite} />
          })}
          {!cartoes.length && <p className="sutil">Nenhum cartão cadastrado.</p>}
          <div className="secao-topo" style={{ marginTop: 20 }}><h3>Despesas por categoria</h3></div>
          {plano.porCategoria.slice(0, 6).map((k) => <Barra key={k.nome} rotulo={k.nome} direita={`${formatarBRL(k.valor)} · ${formatarPct(plano.saidas ? k.valor / plano.saidas : 0)}`} fracao={plano.saidas ? k.valor / plano.saidas : 0} />)}
        </div>
      </div>
    </>
  )
}
