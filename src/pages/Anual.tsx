import { useMemo, useState } from 'react'
import { formatarBRL, formatarCompacto, formatarPct } from '../shared/dinheiro'
import { competenciaDe, hoje, rotuloCompetencia, rotuloMes } from '../shared/data'
import { planoDoMes } from '../domain/planejamento/rules'
import { BarrasPlano, COR_TIPO, LinhaValores, Rosca } from '../ui/components/Graficos'
import { Barra } from '../ui/components/Barra'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

/** Ano pela regra do app: receitas × (custos fixos + faturas + parcelas), mês a mês, com saldo acumulado. */
export function Anual({ dados }: { dados: Dados }) {
  const atual = competenciaDe(hoje())
  const [ano, setAno] = useState(Number(hoje().slice(0, 4)))
  const [sel, setSel] = useState(atual)
  const meses = useMemo(() => {
    let acc = 0
    return Array.from({ length: 12 }, (_, i) => {
      const p = planoDoMes(dados, `${ano}-${String(i + 1).padStart(2, '0')}`)
      acc += p.livre
      return { ...p, acumulado: acc }
    })
  }, [dados, ano])
  const soma = (k: 'entradas' | 'custos' | 'faturas' | 'parcelas' | 'saidas' | 'livre') => meses.reduce((s, m) => s + m[k], 0)
  const entradas = soma('entradas'), saidas = soma('saidas'), livre = soma('livre')
  const comDados = meses.filter((m) => m.entradas || m.saidas)
  const melhor = comDados.length ? comDados.reduce((a, b) => (b.livre > a.livre ? b : a)) : null
  const pior = comDados.length ? comDados.reduce((a, b) => (b.livre < a.livre ? b : a)) : null
  const negativos = comDados.filter((m) => m.livre < 0).length

  // Fontes e categorias do ano.
  const fontes = new Map<string, { valor: number; meses: number[] }>()
  const categorias = new Map<string, number[]>()
  meses.forEach((m, i) => {
    m.porFonte.forEach((f) => {
      const x = fontes.get(f.nome) ?? { valor: 0, meses: Array(12).fill(0) }
      x.valor += f.valor; x.meses[i] = f.valor; fontes.set(f.nome, x)
    })
    m.porCategoria.forEach((k) => {
      const arr = categorias.get(k.nome) ?? Array(12).fill(0)
      arr[i] += k.valor; categorias.set(k.nome, arr)
    })
  })
  const listaFontes = [...fontes].sort((a, b) => b[1].valor - a[1].valor)
  const listaCats = [...categorias].map(([nome, v]) => ({ nome, v, total: v.reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total)
  const mesSel = meses.find((m) => m.competencia === sel) ?? meses[0]

  return (
    <>
      <div className="topo">
        <h1>Análise anual</h1>
        <div className="mes-nav">
          <button className="aba" onClick={() => setAno(ano - 1)} aria-label="Ano anterior">←</button>
          <button className="aba ativa" onClick={() => setAno(Number(hoje().slice(0, 4)))}>{ano}</button>
          <button className="aba" onClick={() => setAno(ano + 1)} aria-label="Próximo ano">→</button>
        </div>
      </div>

      <div className="cards">
        <div className="card"><h3>Receitas no ano</h3><span className="badge">média <Dinheiro valor={comDados.length ? Math.round(entradas / comDados.length) : 0} />/mês</span><div className="valor pos"><Dinheiro valor={entradas} animar tom="pos" /></div></div>
        <div className="card"><h3>Despesas no ano</h3><span className="badge">média <Dinheiro valor={comDados.length ? Math.round(saidas / comDados.length) : 0} />/mês</span><div className="valor"><Dinheiro valor={saidas} animar /></div></div>
        <div className="card"><h3>Saldo do ano</h3><span className={`badge ${livre >= 0 ? 'bom' : 'ruim'}`}>{entradas ? `${formatarPct(livre / entradas)} das receitas` : '—'}</span><div className="valor"><Dinheiro valor={livre} animar tom="auto" /></div></div>
        <div className="card"><h3>Meses no vermelho</h3><span className={`badge ${negativos ? 'ruim' : 'bom'}`}>{pior ? `pior: ${rotuloMes(pior.competencia).toLowerCase()}` : '—'}</span><div className="valor">{negativos}<small className="sutil" style={{ fontSize: 13 }}> de {comDados.length}</small></div></div>
      </div>

      <div className="secao">
        <div className="secao-topo">
          <h3>Receitas × despesas</h3>
          <div className="legenda-cores">
            <span><b style={{ background: COR_TIPO.receita }} />receitas</span><span><b style={{ background: COR_TIPO.custo }} />custos fixos</span>
            <span><b style={{ background: COR_TIPO.fatura }} />faturas</span><span><b style={{ background: COR_TIPO.parcela }} />parcelas</span><span><i />saldo do mês</span>
          </div>
        </div>
        <BarrasPlano meses={meses} selecionado={sel} aoEscolher={setSel} />
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>{rotuloCompetencia(mesSel.competencia)}</h3><span className="sutil">clique num mês do gráfico</span></div>
          <Rosca
            centro={formatarBRL(mesSel.entradas)} sub="receitas"
            fatias={[
              { nome: 'Custos fixos', valor: mesSel.custos, cor: COR_TIPO.custo },
              { nome: 'Faturas', valor: mesSel.faturas, cor: COR_TIPO.fatura },
              { nome: 'Parcelas', valor: mesSel.parcelas, cor: COR_TIPO.parcela },
              { nome: mesSel.livre >= 0 ? 'Sobra' : 'Falta', valor: Math.abs(mesSel.livre), cor: mesSel.livre >= 0 ? COR_TIPO.livre : '#f0b3a8' },
            ]}
          />
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Destaques do ano</h3></div>
          <div className="destaques-ano">
            <div><span>Melhor mês</span><strong>{melhor ? rotuloCompetencia(melhor.competencia) : '—'}</strong>{melhor && <small><Dinheiro valor={melhor.livre} tom="auto" /></small>}</div>
            <div><span>Pior mês</span><strong>{pior ? rotuloCompetencia(pior.competencia) : '—'}</strong>{pior && <small><Dinheiro valor={pior.livre} tom="auto" /></small>}</div>
            <div><span>Custos fixos</span><strong><Dinheiro valor={soma('custos')} /></strong><small>{saidas ? formatarPct(soma('custos') / saidas) : '—'} das despesas</small></div>
            <div><span>Faturas</span><strong><Dinheiro valor={soma('faturas')} /></strong><small>{saidas ? formatarPct(soma('faturas') / saidas) : '—'} das despesas</small></div>
            <div><span>Parcelas</span><strong><Dinheiro valor={soma('parcelas')} /></strong><small>{saidas ? formatarPct(soma('parcelas') / saidas) : '—'} das despesas</small></div>
            <div><span>Comprometimento médio</span><strong>{entradas ? formatarPct(saidas / entradas) : '—'}</strong><small>despesas ÷ receitas</small></div>
          </div>
        </div>
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>Saldo acumulado no ano</h3><span className="sutil">soma de receitas − despesas, mês a mês</span></div>
        <LinhaValores pontos={meses.map((m) => ({ rotulo: rotuloMes(m.competencia), valor: m.acumulado, destaque: m.competencia === atual }))} />
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>Mês a mês</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela">
            <thead><tr><th>Mês</th><th style={{ textAlign: 'right' }}>Receitas</th><th style={{ textAlign: 'right' }}>Custos fixos</th><th style={{ textAlign: 'right' }}>Faturas</th><th style={{ textAlign: 'right' }}>Parcelas</th><th style={{ textAlign: 'right' }}>Despesas</th><th style={{ textAlign: 'right' }}>Saldo</th><th style={{ textAlign: 'right' }}>Acumulado</th><th style={{ textAlign: 'right' }}>Compr.</th></tr></thead>
            <tbody>{meses.map((m) => (
              <tr key={m.competencia} className={m.competencia === atual ? 'destaque' : m.competencia === sel ? 'linha-sel' : ''} onClick={() => setSel(m.competencia)} style={{ cursor: 'pointer' }}>
                <td>{rotuloMes(m.competencia)}</td>
                <td className="num"><Dinheiro valor={m.entradas} tom="pos" /></td>
                <td className="num"><Dinheiro valor={m.custos} tom="neutro" /></td>
                <td className="num"><Dinheiro valor={m.faturas} tom="neutro" /></td>
                <td className="num"><Dinheiro valor={m.parcelas} tom="neutro" /></td>
                <td className="num"><Dinheiro valor={m.saidas} tom="neutro" /></td>
                <td className="num"><Dinheiro valor={m.livre} tom="auto" /></td>
                <td className="num"><Dinheiro valor={m.acumulado} tom="auto" /></td>
                <td className="num sutil">{m.comprometimento == null ? '—' : formatarPct(m.comprometimento)}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td>TOTAL</td><td className="num"><Dinheiro valor={entradas} tom="pos" /></td><td className="num"><Dinheiro valor={soma('custos')} /></td><td className="num"><Dinheiro valor={soma('faturas')} /></td><td className="num"><Dinheiro valor={soma('parcelas')} /></td><td className="num"><Dinheiro valor={saidas} /></td><td className="num"><Dinheiro valor={livre} tom="auto" /></td><td /><td className="num">{entradas ? formatarPct(saidas / entradas) : '—'}</td></tr></tfoot>
          </table>
        </div>
      </div>

      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Receitas por fonte</h3><span className="sutil"><Dinheiro valor={entradas} /></span></div>
          {listaFontes.map(([nome, x]) => (
            <div key={nome} className="fonte-ano">
              <Barra rotulo={nome} direita={`${formatarBRL(x.valor)} · ${formatarPct(entradas ? x.valor / entradas : 0)}`} fracao={entradas ? x.valor / entradas : 0} />
              <div className="mini-barras" aria-hidden="true">{x.meses.map((v, i) => <i key={i} style={{ height: `${Math.max(2, (v / Math.max(1, ...x.meses)) * 100)}%`, opacity: v ? 1 : .25 }} title={`${rotuloMes(meses[i].competencia)} ${formatarBRL(v)}`} />)}</div>
            </div>
          ))}
          {!listaFontes.length && <p className="sutil">Sem receitas neste ano.</p>}
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Despesas por categoria</h3><span className="sutil"><Dinheiro valor={saidas} /></span></div>
          {listaCats.slice(0, 10).map((k) => <Barra key={k.nome} rotulo={k.nome} direita={`${formatarBRL(k.total)} · ${formatarPct(saidas ? k.total / saidas : 0)}`} fracao={saidas ? k.total / saidas : 0} />)}
          {!listaCats.length && <p className="sutil">Sem despesas neste ano.</p>}
        </div>
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>Categorias mês a mês</h3></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tabela tabela-calor">
            <thead><tr><th>Categoria</th>{meses.map((m) => <th key={m.competencia} style={{ textAlign: 'right' }}>{rotuloMes(m.competencia)}</th>)}<th style={{ textAlign: 'right' }}>Total</th></tr></thead>
            <tbody>{listaCats.map((k) => {
              const maxK = Math.max(1, ...k.v)
              return (
                <tr key={k.nome}><td>{k.nome}</td>{k.v.map((v, i) => <td key={i} className="num" style={{ background: v ? `rgba(234,154,25,${0.08 + 0.32 * (v / maxK)})` : undefined }}>{v ? formatarCompacto(v).replace('R$ ', '') : '·'}</td>)}<td className="num"><strong>{formatarCompacto(k.total)}</strong></td></tr>
              )
            })}</tbody>
          </table>
        </div>
      </div>
    </>
  )
}
