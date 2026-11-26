import { useMemo, useState } from 'react'
import { formatarBRL, formatarPct, variacao } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia, rotuloMes } from '../shared/data'
import { fluxoDoMes, planoDoMes, saldoDoMes, type TipoEvento } from '../domain/planejamento/rules'
import { relatorioMensal } from '../domain/relatorio/rules'
import { saldoDevedor } from '../domain/divida/rules'
import { Anel, COR_TIPO, FluxoDiario, Rosca } from '../ui/components/Graficos'
import { Barra } from '../ui/components/Barra'
import { Vazio } from '../ui/components/Campos'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

const ROTULO_TIPO: Record<TipoEvento, string> = { receita: 'receita', custo: 'custo fixo', fatura: 'fatura', parcela: 'parcela' }
const br = (d: string) => d.split('-').reverse().slice(0, 2).join('/')

/**
 * Relatório do mês pela regra do app: receitas = Receitas; despesas = custos fixos + faturas
 * do mês + parcelas das dívidas. Lançamentos aparecem à parte, como realizado.
 */
export function Relatorio({ dados }: { dados: Dados }) {
  const atual = competenciaDe(hoje())
  const [c, setC] = useState(atual)
  const plano = useMemo(() => planoDoMes(dados, c), [dados, c])
  const anterior = useMemo(() => planoDoMes(dados, deslocarCompetencia(c, -1)), [dados, c])
  const dia = c === atual ? hoje() : c < atual ? `${c}-31` : `${c}-00`
  const saldo = saldoDoMes(plano, dia)
  const fluxo = fluxoDoMes(plano, 0)
  const rel = useMemo(() => relatorioMensal({ ...dados, competencia: c, hoje: hoje() }), [dados, c])
  const devedor = saldoDevedor(dados.parcelas.filter((p) => dados.dividas.some((d) => d.id === p.divida_id && d.status !== 'QUITADA')))
  const vEntradas = variacao(plano.entradas, anterior.entradas)
  const vSaidas = variacao(plano.saidas, anterior.saidas)

  // Saúde do mês previsto: livre 40, comprometimento 30, dívidas 20, fontes 10.
  const lin = (v: number, de: number, ate: number) => Math.max(0, Math.min(1, (v - de) / (ate - de)))
  const pLivre = plano.taxaLivre == null ? 0 : Math.round(40 * lin(plano.taxaLivre, 0, 0.25))
  const pComp = plano.comprometimento == null ? 0 : Math.round(30 * (1 - lin(plano.comprometimento, 0.5, 1)))
  const pDiv = Math.round(20 * (1 - lin(plano.entradas ? devedor / plano.entradas : devedor ? 99 : 0, 0, 12)))
  const pFontes = plano.porFonte.length >= 3 ? 10 : plano.porFonte.length === 2 ? 7 : plano.porFonte.length ? 4 : 0
  const score = pLivre + pComp + pDiv + pFontes
  const faixa = score >= 80 ? 'Excelente' : score >= 60 ? 'Bom' : score >= 40 ? 'Atenção' : 'Crítico'

  const alertas: string[] = []
  if (plano.livre < 0) alertas.push(`As despesas do mês passam das receitas em ${formatarBRL(-plano.livre)}.`)
  if (fluxo.menor.valor < 0) alertas.push(`Em ${br(fluxo.menor.data)} o mês fica negativo (${formatarBRL(fluxo.menor.valor)}) antes das próximas entradas: vale antecipar ou reorganizar vencimentos.`)
  if (plano.comprometimento != null && plano.comprometimento > 0.7) alertas.push(`${formatarPct(plano.comprometimento)} das receitas já estão presas em custos, faturas e parcelas.`)
  const atrasadas = dados.parcelas.filter((p) => !p.pago_em && p.vencimento < hoje()).length
  if (atrasadas) alertas.push(`${atrasadas} parcela(s) de dívida em atraso.`)

  return (
    <>
      <div className="topo">
        <h1>Relatório mensal</h1>
        <div className="mes-nav">
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, -1))} aria-label="Mês anterior">←</button>
          <button className={`aba ${c === atual ? 'ativa' : ''}`} onClick={() => setC(atual)}>{rotuloCompetencia(c)}</button>
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, 1))} aria-label="Próximo mês">→</button>
        </div>
      </div>

      <div className="cards">
        <div className="card"><h3>Receitas</h3>{vEntradas != null ? <span className={`badge ${vEntradas >= 0 ? 'bom' : 'ruim'}`}>{formatarPct(vEntradas, true)} vs {rotuloMes(anterior.competencia).toLowerCase()}</span> : <span className="badge">{plano.porFonte.length} fontes</span>}<div className="valor pos"><Dinheiro valor={plano.entradas} animar tom="pos" /></div></div>
        <div className="card"><h3>Despesas</h3>{vSaidas != null ? <span className={`badge ${vSaidas <= 0 ? 'bom' : 'ruim'}`}>{formatarPct(vSaidas, true)} vs {rotuloMes(anterior.competencia).toLowerCase()}</span> : <span className="badge">fixos, faturas e parcelas</span>}<div className="valor"><Dinheiro valor={plano.saidas} animar /></div></div>
        <div className="card"><h3>{c === atual ? 'Saldo hoje' : c < atual ? 'Saldo do mês' : 'Saldo previsto'}</h3><span className="badge">{c === atual ? `fecha em ${formatarBRL(saldo.fechamento)}` : 'receitas − despesas'}</span><div className="valor"><Dinheiro valor={c === atual ? saldo.ateHoje : saldo.fechamento} animar tom="auto" /></div></div>
        <div className="card"><h3>Comprometimento</h3><span className={`badge ${plano.comprometimento == null ? '' : plano.comprometimento <= 0.5 ? 'bom' : plano.comprometimento > 0.8 ? 'ruim' : ''}`}>despesas ÷ receitas</span><div className="valor">{plano.comprometimento == null ? '—' : formatarPct(plano.comprometimento)}</div></div>
      </div>

      {c === atual && (
        <div className="secao faixa-hoje">
          <div><span>Já entrou</span><strong><Dinheiro valor={saldo.entrou} tom="pos" /></strong></div>
          <div><span>Já saiu</span><strong><Dinheiro valor={saldo.saiu} /></strong></div>
          <div><span>Falta receber</span><strong><Dinheiro valor={saldo.aReceber} tom="pos" /></strong></div>
          <div><span>Falta pagar</span><strong><Dinheiro valor={saldo.aPagar} /></strong></div>
          <div><span>Fecha o mês com</span><strong><Dinheiro valor={saldo.fechamento} tom="auto" /></strong></div>
        </div>
      )}

      <div className="secao">
        <div className="secao-topo">
          <h3>Saldo ao longo do mês</h3>
          <span className="sutil">menor ponto {formatarBRL(fluxo.menor.valor)} em {br(fluxo.menor.data)}</span>
        </div>
        <FluxoDiario dias={fluxo.dias} hoje={c === atual ? hoje() : undefined} />
        <div className="legenda-cores"><span><b style={{ background: COR_TIPO.receita }} />entrada</span><span><b style={{ background: COR_TIPO.fatura }} />saída</span>{c === atual && <span><i style={{ borderColor: '#1c1c1c' }} />hoje</span>}</div>
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Para onde vão as receitas</h3></div>
          <Rosca
            centro={formatarBRL(plano.entradas)} sub="receitas"
            fatias={[
              { nome: 'Custos fixos', valor: plano.custos, cor: COR_TIPO.custo },
              { nome: 'Faturas de cartão', valor: plano.faturas, cor: COR_TIPO.fatura },
              { nome: 'Parcelas de dívidas', valor: plano.parcelas, cor: COR_TIPO.parcela },
              { nome: plano.livre >= 0 ? 'Sobra' : 'Falta', valor: Math.abs(plano.livre), cor: plano.livre >= 0 ? COR_TIPO.livre : '#f0b3a8' },
            ]}
          />
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Saúde do mês</h3><span className={`tag ${score >= 60 ? 'bom' : score >= 40 ? '' : 'ruim'}`}>{faixa}</span></div>
          <div className="score">
            <Anel valor={score} rotulo="de 100" />
            <div>
              <Barra rotulo="Sobra · cheia com 25% das receitas livres" direita={`${pLivre}/40`} fracao={pLivre / 40} />
              <Barra rotulo="Comprometimento · cheio até 50%, zera em 100%" direita={`${pComp}/30`} fracao={pComp / 30} />
              <Barra rotulo="Dívidas · saldo devedor em relação à renda" direita={`${pDiv}/20`} fracao={pDiv / 20} />
              <Barra rotulo="Fontes de renda · mais fontes, menos risco" direita={`${pFontes}/10`} fracao={pFontes / 10} />
            </div>
          </div>
        </div>
      </div>
      {alertas.length > 0 && <div className="secao">{alertas.map((a) => <div key={a} className="aviso" style={{ marginBottom: 8 }}>{a}</div>)}</div>}

      <div className="secao">
        <div className="secao-topo"><h3>Tudo do mês, na ordem</h3><span className="sutil">{plano.eventos.length} itens</span></div>
        {plano.eventos.length ? (
          <table className="tabela">
            <thead><tr><th>Dia</th><th>Item</th><th>Tipo</th><th>Categoria</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>Saldo do mês</th></tr></thead>
            <tbody>{(() => {
              let acc = 0
              return plano.eventos.map((ev, i) => {
                acc += ev.efeito
                return (
                  <tr key={i} className={ev.data <= hoje() && c === atual ? 'passado' : ''}>
                    <td className="num-esq">{br(ev.data)}</td>
                    <td><strong className="receita-titulo">{ev.nome}</strong>{ev.detalhe && <div className="sutil">{ev.detalhe}</div>}</td>
                    <td><span className={`tag ev-${ev.tipo}`}>{ROTULO_TIPO[ev.tipo]}</span>{ev.pago && <span className="tag bom" style={{ marginLeft: 6 }}>paga</span>}</td>
                    <td className="sutil">{ev.categoria ?? '—'}</td>
                    <td className="num"><Dinheiro valor={ev.efeito} tom={ev.efeito > 0 ? 'pos' : 'neutro'} sinal /></td>
                    <td className="num"><Dinheiro valor={acc} tom="auto" /></td>
                  </tr>
                )
              })
            })()}</tbody>
            <tfoot><tr><td colSpan={4}>Receitas − despesas</td><td /><td className="num"><Dinheiro valor={plano.livre} tom="auto" /></td></tr></tfoot>
          </table>
        ) : <Vazio>Nada previsto para este mês.</Vazio>}
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Despesas por categoria</h3><span className="sutil"><Dinheiro valor={plano.saidas} /></span></div>
          {plano.porCategoria.map((k) => <Barra key={k.nome} rotulo={k.nome} direita={`${formatarBRL(k.valor)} · ${formatarPct(plano.saidas ? k.valor / plano.saidas : 0)}`} fracao={plano.saidas ? k.valor / plano.saidas : 0} />)}
          {!plano.porCategoria.length && <Vazio>Sem despesas neste mês.</Vazio>}
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Fontes de renda</h3><span className="sutil"><Dinheiro valor={plano.entradas} /></span></div>
          {plano.porFonte.map((f) => <Barra key={f.nome} rotulo={`${f.nome} · ${f.regra === 'HORAS' ? 'por hora' : f.regra === 'AVULSA' ? 'avulsa' : f.regra === 'VARIAVEL' ? 'variável' : 'fixa'}`} direita={`${formatarBRL(f.valor)} · ${formatarPct(plano.entradas ? f.valor / plano.entradas : 0)}`} fracao={plano.entradas ? f.valor / plano.entradas : 0} />)}
          {!plano.porFonte.length && <Vazio>Nenhuma receita prevista.</Vazio>}
        </div>
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Dívidas</h3><span className="sutil">saldo devedor <Dinheiro valor={devedor} /></span></div>
          {dados.dividas.filter((d) => d.status !== 'QUITADA').map((d) => {
            const ps = dados.parcelas.filter((p) => p.divida_id === d.id)
            const pagas = ps.filter((p) => p.pago_em).length
            return <Barra key={d.id} rotulo={`${d.nome} · ${pagas}/${ps.length} pagas`} direita={formatarBRL(saldoDevedor(ps))} fracao={ps.length ? pagas / ps.length : 0} />
          })}
          {!dados.dividas.some((d) => d.status !== 'QUITADA') && <Vazio>Nenhuma dívida ativa.</Vazio>}
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Realizado (lançamentos)</h3><span className="sutil">o que foi registrado em Lançamentos</span></div>
          {plano.realizado.temDados ? (
            <>
              <Barra rotulo={`Receitas lançadas · previsto ${formatarBRL(plano.entradas)}`} direita={formatarBRL(plano.realizado.receitas)} fracao={plano.entradas ? plano.realizado.receitas / plano.entradas : 0} />
              <Barra rotulo={`Despesas lançadas · previsto ${formatarBRL(plano.saidas)}`} direita={formatarBRL(plano.realizado.despesas)} fracao={plano.saidas ? plano.realizado.despesas / plano.saidas : 0} estourada={plano.realizado.despesas > plano.saidas} />
              <p className="sutil" style={{ margin: 0 }}>Resultado lançado: <Dinheiro valor={plano.realizado.resultado} tom="auto" /></p>
            </>
          ) : <p className="sutil" style={{ margin: 0 }}>Nenhum lançamento neste mês. O relatório usa o previsto das suas receitas, custos fixos, faturas e dívidas.</p>}
          <div className="secao-topo" style={{ marginTop: 22 }}><h3>Reserva de emergência</h3><span className="sutil">meta {rel.reserva.meta} meses</span></div>
          <Barra rotulo={`${formatarBRL(rel.reserva.valor)} em poupança e investimentos`} direita={plano.saidas ? `${(rel.reserva.valor / plano.saidas).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses` : '—'} fracao={plano.saidas ? rel.reserva.valor / plano.saidas / rel.reserva.meta : 0} />
        </div>
      </div>
    </>
  )
}
