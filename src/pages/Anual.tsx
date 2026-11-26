import { useMemo, useState } from 'react'
import { formatarBRL, formatarCompacto, formatarPct } from '../shared/dinheiro'
import { competenciaDe, hoje, rotuloMes } from '../shared/data'
import { categoriasNoAno, serieAnual } from '../domain/relatorio/rules'
import { BarrasMensais, LinhaAcumulada } from '../ui/components/Graficos'
import type { Dados } from '../ui/useDados'

export function Anual({ dados }: { dados: Dados }) {
  const [ano, setAno] = useState(Number(hoje().slice(0, 4)))
  const s = useMemo(() => serieAnual(dados.lancamentos, ano), [dados, ano])
  const cats = useMemo(() => categoriasNoAno(dados.lancamentos, ano), [dados, ano])
  const atual = competenciaDe(hoje())

  return (
    <>
      <div className="topo">
        <h1>Análise anual</h1>
        <div className="abas">
          <button className="aba" onClick={() => setAno(ano - 1)}>←</button>
          <button className="aba ativa">{ano}</button>
          <button className="aba" onClick={() => setAno(ano + 1)}>→</button>
        </div>
      </div>
      <div className="cards">
        <div className="card"><h3>Receitas no ano</h3><span className="badge">média {formatarBRL(s.mediaReceitas)}</span><div className="valor">{formatarBRL(s.receitas)}</div></div>
        <div className="card"><h3>Despesas no ano</h3><span className="badge">média {formatarBRL(s.mediaDespesas)}</span><div className="valor">{formatarBRL(s.despesas)}</div></div>
        <div className="card"><h3>Saldo do ano</h3><span className={`badge ${s.saldo >= 0 ? 'bom' : 'ruim'}`}>{s.mesesComDados} meses com dados</span><div className="valor">{formatarBRL(s.saldo)}</div></div>
        <div className="card"><h3>Taxa de poupança</h3><span className={`badge ${s.taxaPoupanca != null && s.taxaPoupanca >= 0.2 ? 'bom' : ''}`}>meta 20%</span><div className="valor">{s.taxaPoupanca == null ? '—' : formatarPct(s.taxaPoupanca)}</div></div>
      </div>
      <div className="secao">
        <div className="secao-topo">
          <h3>Receitas × despesas</h3>
          <div className="legenda-grafico"><span><b className="s-escuro" />Receitas</span><span><b className="s-laranja" />Despesas</span></div>
        </div>
        <BarrasMensais meses={s.meses} />
      </div>
      <div className="secao">
        <div className="secao-topo"><h3>Saldo acumulado</h3><span className="sutil">soma das sobras mês a mês</span></div>
        <LinhaAcumulada meses={s.meses} />
      </div>
      <div className="secao">
        <div className="secao-topo"><h3>Mês a mês</h3></div>
        <table className="tabela">
          <thead><tr><th>Mês</th><th style={{ textAlign: 'right' }}>Receitas</th><th style={{ textAlign: 'right' }}>Despesas</th><th style={{ textAlign: 'right' }}>Saldo</th><th style={{ textAlign: 'right' }}>Acumulado</th><th style={{ textAlign: 'right' }}>Poupança</th></tr></thead>
          <tbody>{s.meses.map((m) => (
            <tr key={m.competencia} className={m.competencia === atual ? 'destaque' : ''}>
              <td>{rotuloMes(m.competencia)}</td>
              <td className="num pos">{formatarBRL(m.receitas)}</td>
              <td className="num">{formatarBRL(m.despesas)}</td>
              <td className="num" style={{ color: m.saldo < 0 ? 'var(--vermelho)' : undefined }}>{formatarBRL(m.saldo)}</td>
              <td className="num">{formatarBRL(m.acumulado)}</td>
              <td className="num sutil">{m.receitas ? formatarPct(m.saldo / m.receitas) : '—'}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr><td>TOTAL</td><td className="num">{formatarBRL(s.receitas)}</td><td className="num">{formatarBRL(s.despesas)}</td><td className="num">{formatarBRL(s.saldo)}</td><td /><td className="num">{s.taxaPoupanca == null ? '—' : formatarPct(s.taxaPoupanca)}</td></tr></tfoot>
        </table>
      </div>
      <div className="secao">
        <div className="secao-topo"><h3>Categorias no ano</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Categoria</th>{s.meses.map((m) => <th key={m.competencia} style={{ textAlign: 'right' }}>{rotuloMes(m.competencia)}</th>)}<th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>{cats.map((k) => (
              <tr key={k.nome}><td>{k.nome}</td>{k.valores.map((v, i) => <td key={i} className="num sutil">{v ? formatarCompacto(v).replace('R$ ', '') : '·'}</td>)}<td className="num"><strong>{formatarCompacto(k.total)}</strong></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}
