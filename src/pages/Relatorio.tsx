import { useMemo, useState } from 'react'
import { formatarBRL, formatarPct } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../shared/data'
import { relatorioMensal } from '../domain/relatorio/rules'
import { despesaPorCategoria } from '../domain/lancamento/rules'
import { efeitoNaConta } from '../domain/lancamento/rules'
import { Anel, Segmentos } from '../ui/components/Graficos'
import { Barra } from '../ui/components/Barra'
import { Vazio } from '../ui/components/Campos'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

export function Relatorio({ dados }: { dados: Dados }) {
  const [c, setC] = useState(competenciaDe(hoje()))
  const r = useMemo(() => relatorioMensal({ ...dados, competencia: c, hoje: hoje() }), [dados, c])
  const categorias = despesaPorCategoria(dados.lancamentos, c)
  const porConta = dados.contas.filter((x) => !x.arquivada).map((conta) => {
    const doMes = dados.lancamentos.filter((l) => l.data.startsWith(c))
    const mov = doMes.map((l) => efeitoNaConta(l, conta.id))
    return {
      conta,
      entrou: mov.filter((v) => v > 0).reduce((s, v) => s + v, 0),
      saiu: -mov.filter((v) => v < 0).reduce((s, v) => s + v, 0),
      pendente: doMes.filter((l) => l.status === 'PENDENTE' && l.conta_id === conta.id).reduce((s, l) => s + (l.tipo === 'RECEITA' ? l.valor : -l.valor), 0),
    }
  })
  const corDaFaixa = r.score.total >= 60 ? 'bom' : r.score.total >= 40 ? '' : 'ruim'

  return (
    <>
      <div className="topo">
        <h1>Relatório mensal</h1>
        <div className="abas">
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, -1))}>←</button>
          <button className="aba ativa">{rotuloCompetencia(c)}</button>
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, 1))}>→</button>
        </div>
      </div>
      <div className="cards">
        <div className="card"><h3>Receitas</h3><span className="badge">prevista <Dinheiro valor={r.receitaPrevista} /></span><div className="valor"><Dinheiro valor={r.receitas} animar /></div></div>
        <div className="card"><h3>Despesas</h3><span className="badge"><Dinheiro valor={r.essenciais} /> essenciais</span><div className="valor"><Dinheiro valor={r.despesas} animar /></div></div>
        <div className="card"><h3>Sobra</h3><span className={`badge ${r.sobra >= 0 ? 'bom' : 'ruim'}`}>{r.taxaPoupanca == null ? 'sem receita' : `${formatarPct(r.taxaPoupanca)} da receita`}</span><div className="valor"><Dinheiro valor={r.sobra} animar /></div></div>
        <div className="card"><h3>Comprometimento</h3><span className={`badge ${r.comprometimento == null ? '' : r.comprometimento <= 0.3 ? 'bom' : r.comprometimento > 0.5 ? 'ruim' : ''}`}>fixos + parcelas</span><div className="valor">{r.comprometimento == null ? '—' : formatarPct(r.comprometimento)}</div></div>
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>Saúde financeira</h3><span className={`tag ${corDaFaixa}`}>{r.score.faixa}</span></div>
        <div className="score">
          <Anel valor={r.score.total} rotulo="de 100" />
          <div>
            {r.score.componentes.map((k) => (
              <div key={k.nome} title={k.explicacao}>
                <Barra rotulo={`${k.nome} · ${k.explicacao}`} direita={`${k.pontos}/${k.maximo}`} fracao={k.pontos / k.maximo} />
              </div>
            ))}
          </div>
        </div>
        {r.alertas.map((a) => <div key={a} className="aviso" style={{ marginTop: 10, marginBottom: 0 }}>{a}</div>)}
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Para onde foi o dinheiro</h3></div>
          <Segmentos partes={[
            { nome: 'Essenciais', valor: r.essenciais, classe: 's-escuro' },
            { nome: 'Não essenciais', valor: r.naoEssenciais, classe: 's-laranja' },
            { nome: 'Sobra', valor: Math.max(0, r.sobra), classe: 's-claro' },
          ]} />
          <div style={{ marginTop: 22 }}>
            {categorias.slice(0, 8).map((f) => <Barra key={String(f.categoria_id)} rotulo={f.nome} direita={`${formatarBRL(f.valor)} · ${formatarPct(f.participacao)}`} fracao={f.participacao} />)}
            {!categorias.length && <Vazio>Sem despesas neste mês.</Vazio>}
          </div>
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Compromissos do mês</h3><span className="sutil"><Dinheiro valor={r.compromissos} /></span></div>
          <div className="item-lista"><span>Custos fixos</span><strong><Dinheiro valor={r.custosFixos} /></strong></div>
          <div className="item-lista"><span>Parcelas de dívidas</span><strong><Dinheiro valor={r.parcelasDoMes} /></strong></div>
          <div className="item-lista"><span>Saldo devedor total</span><strong><Dinheiro valor={r.saldoDevedor} /></strong></div>

          <div className="secao-topo" style={{ marginTop: 26 }}><h3>Reserva de emergência</h3><span className="sutil">meta {r.reserva.meta} meses</span></div>
          <Barra
            rotulo={`${formatarBRL(r.reserva.valor)} em poupança e investimentos`}
            direita={r.reserva.meses == null ? '—' : `${r.reserva.meses.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses`}
            fracao={(r.reserva.meses ?? 0) / r.reserva.meta}
          />
          <p className="sutil" style={{ margin: 0 }}>
            Despesa média <Dinheiro valor={r.reserva.despesaMedia} />/mês.{' '}
            {r.reserva.mesesParaMeta === 0 ? 'Meta atingida.' : r.reserva.mesesParaMeta == null ? 'Com a sobra deste mês, a meta não avança.' : `Guardando a sobra deste mês, a meta chega em ${r.reserva.mesesParaMeta} meses.`}
          </p>
        </div>
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Fontes de renda</h3></div>
          {r.fontesDeRenda.map((f) => <Barra key={f.nome} rotulo={f.nome} direita={formatarBRL(f.valor)} fracao={r.receitas ? f.valor / r.receitas : 0} />)}
          {!r.fontesDeRenda.length && <Vazio>Nenhuma receita recebida neste mês.</Vazio>}
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Movimento por conta</h3></div>
          <table className="tabela">
            <thead><tr><th>Conta</th><th style={{ textAlign: 'right' }}>Entrou</th><th style={{ textAlign: 'right' }}>Saiu</th><th style={{ textAlign: 'right' }}>Pendente</th></tr></thead>
            <tbody>{porConta.map((p) => (
              <tr key={p.conta.id}><td>{p.conta.nome}</td><td className="num pos"><Dinheiro valor={p.entrou} tom="pos" /></td><td className="num"><Dinheiro valor={p.saiu} /></td><td className="num sutil"><Dinheiro valor={p.pendente} /></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}
