import { useMemo, useState } from 'react'
import { formatarPct } from '../shared/dinheiro'
import { competenciaDe, hoje, rotuloCompetencia } from '../shared/data'
import { atualizarCategoria, criarCategoria, excluirCategoria } from '../domain/categoria/repository'
import type { Categoria, TipoCategoria } from '../domain/categoria/model'
import { confirmado } from '../domain/lancamento/rules'
import { Modal, BotaoExcluir, IconeEditar } from '../ui/components/Modal'
import { Dinheiro } from '../ui/components/Dinheiro'
import { Campo, Texto, Interruptor, Segmentos, Busca, Vazio } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import type { Dados } from '../ui/useDados'
import { toast } from '../ui/toast'

const CORES = ['#EA9A19', '#1C1C1C', '#C9412E', '#1F9D55', '#3B6FD4', '#8E5BD1', '#D45B9A', '#2AA3A3', '#A39A5B', '#77756C']
const corDe = (k: Categoria) => k.cor ?? CORES[k.id % CORES.length]

export function Categorias({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [tipo, setTipo] = useState<TipoCategoria>('DESPESA')
  const [editando, setEditando] = useState<Categoria | 'nova' | null>(null)
  const f = useForm({ nome: '', essencial: false, cor: CORES[0] })
  const [busca, setBusca] = useState('')
  const c = competenciaDe(hoje())
  const linhas = useMemo(() => {
    const doTipo = dados.categorias.filter((k) => k.tipo === tipo)
    const stats = new Map<number, { qtd: number; ultimo: string | null; mes: number }>()
    for (const l of dados.lancamentos) {
      if (!l.categoria_id) continue
      const st = stats.get(l.categoria_id) ?? { qtd: 0, ultimo: null, mes: 0 }
      st.qtd++
      if (!st.ultimo || l.data > st.ultimo) st.ultimo = l.data
      if (confirmado(l) && competenciaDe(l.data) === c) st.mes += l.valor
      stats.set(l.categoria_id, st)
    }
    const recorrentes = new Map<number, number>()
    for (const r of [...dados.receitas, ...dados.custosFixos, ...dados.dividas])
      if (r.categoria_id) recorrentes.set(r.categoria_id, (recorrentes.get(r.categoria_id) ?? 0) + 1)
    const totalMes = doTipo.reduce((t, k) => t + (stats.get(k.id)?.mes ?? 0), 0)
    return doTipo
      .map((k) => {
        const st = stats.get(k.id) ?? { qtd: 0, ultimo: null, mes: 0 }
        return { k, ...st, recorrentes: recorrentes.get(k.id) ?? 0, part: totalMes ? st.mes / totalMes : 0 }
      })
      .sort((a, b) => b.mes - a.mes || b.qtd - a.qtd || a.k.nome.localeCompare(b.k.nome))
  }, [dados, tipo, c])
  const q = busca.trim().toLowerCase()
  const visiveis = q ? linhas.filter((x) => x.k.nome.toLowerCase().includes(q)) : linhas
  const totalMes = linhas.reduce((t, x) => t + x.mes, 0)
  const semUso = linhas.filter((x) => !x.qtd && !x.recorrentes).length

  function abrir(k?: Categoria) {
    f.reiniciar(k ? { nome: k.nome, essencial: !!k.essencial, cor: corDe(k) } : { nome: '', essencial: false, cor: CORES[0] })
    setEditando(k ?? 'nova')
  }
  async function salvar() {
    const nome = f.valores.nome.trim()
    if (!nome) return f.setErros({ nome: 'Informe o nome.' })
    if (dados.categorias.some((k) => k.tipo === tipo && k.nome.toLowerCase() === nome.toLowerCase() && (editando === 'nova' || k.id !== editando?.id)))
      return f.setErros({ nome: 'Já existe uma categoria com esse nome.' })
    if (editando === 'nova') {
      const id = await criarCategoria(nome, tipo, f.valores.essencial)
      if (id) await atualizarCategoria(id, nome, f.valores.essencial, f.valores.cor)
    } else if (editando) await atualizarCategoria(editando.id, nome, f.valores.essencial, f.valores.cor)
    toast.sucesso(editando === 'nova' ? 'Categoria criada' : 'Categoria atualizada', nome)
    setEditando(null); recarregar()
  }

  return (
    <>
      <div className="topo">
        <h1>Categorias</h1>
        <button className="botao" onClick={() => abrir()}>Nova categoria</button>
      </div>
      <div className="cat-resumo cards">
        <div className="card"><h3>{tipo === 'DESPESA' ? 'Categorias de despesa' : 'Categorias de receita'}</h3><div className="valor">{linhas.length}</div><span className="sutil">{linhas.filter((x) => x.k.essencial).length} essenciais</span></div>
        <div className="card"><h3>{tipo === 'DESPESA' ? 'Gasto' : 'Recebido'} em {rotuloCompetencia(c).toLowerCase()}</h3><div className="valor"><Dinheiro valor={totalMes} animar /></div><span className="sutil">{linhas.filter((x) => x.mes).length} categorias com movimento</span></div>
        <div className="card"><h3>Sem uso</h3><div className="valor">{semUso}</div><span className="sutil">sem lançamentos nem recorrentes</span></div>
      </div>
      <div className="secao">
        <div className="cat-barra-topo">
          <div style={{ width: 260 }}><Segmentos value={tipo} onChange={(v) => setTipo(v as TipoCategoria)} itens={[{ id: 'DESPESA', nome: 'Despesas' }, { id: 'RECEITA', nome: 'Receitas' }]} /></div>
          <Busca value={busca} onChange={setBusca} placeholder="Buscar categoria" />
        </div>
        {visiveis.length ? (
          <table className="tabela">
            <thead><tr>
              <th>Categoria</th>
              <th style={{ textAlign: 'center' }}>Lançamentos</th>
              <th style={{ textAlign: 'center' }}>Recorrentes</th>
              <th>Último uso</th>
              <th style={{ textAlign: 'right' }}>Este mês</th>
              <th style={{ textAlign: 'right' }}>Participação</th>
              <th />
            </tr></thead>
            <tbody>
              {visiveis.map(({ k, qtd, recorrentes, ultimo, mes, part }) => (
                <tr key={k.id}>
                  <td>
                    <div className="cat-nome">
                      <span className="cat-icone" style={{ background: corDe(k) }}>{k.nome.slice(0, 1).toUpperCase()}</span>
                      <span><strong>{k.nome}</strong>{k.essencial ? <small>essencial</small> : null}</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}><span className={`cat-uso ${qtd ? '' : 'zero'}`}>{qtd}</span></td>
                  <td style={{ textAlign: 'center' }}><span className={`cat-uso ${recorrentes ? '' : 'zero'}`}>{recorrentes}</span></td>
                  <td className="sutil">{ultimo ? ultimo.split('-').reverse().join('/') : '—'}</td>
                  <td className="num">{mes ? <Dinheiro valor={mes} tom={tipo === 'RECEITA' ? 'pos' : 'neutro'} /> : <span className="sutil">—</span>}</td>
                  <td className="num"><div className="cat-part"><span className="sutil">{formatarPct(part)}</span><div className="barra"><i style={{ width: `${part * 100}%`, background: corDe(k) }} /></div></div></td>
                  <td>
                    <div className="acoes">
                      <button className="botao-icone" onClick={() => abrir(k)} aria-label={`Editar ${k.nome}`} title="Editar"><IconeEditar /></button>
                      <BotaoExcluir icone rotulo={`Excluir ${k.nome}`} onConfirmar={async () => {
                        const r = await excluirCategoria(k.id)
                        if (r === 'em-uso') toast.aviso(`${k.nome} não foi excluída`, 'Está em uso em lançamentos, orçamentos ou recorrentes.')
                        else toast.sucesso('Categoria excluída', k.nome)
                        recarregar()
                      }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vazio>{q ? 'Nenhuma categoria com esse nome.' : 'Nenhuma categoria ainda.'}</Vazio>}
      </div>
      <Modal titulo={editando === 'nova' ? 'Nova categoria' : 'Editar categoria'} aberto={editando != null} fechar={() => setEditando(null)} largura={480} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
        <Campo rotulo="Nome" erro={f.erros.nome} largo><Texto autoFocus {...f.campo('nome')} /></Campo>
        <div className="campo" style={{ gridColumn: '1 / -1' }}>
          <span className="campo-rotulo">Cor</span>
          <div className="cores">
            {CORES.map((cor) => (
              <button key={cor} type="button" aria-label={`Cor ${cor}`} aria-pressed={f.valores.cor === cor}
                className={`cor ${f.valores.cor === cor ? 'on' : ''}`} style={{ background: cor, ['--cor' as string]: cor }}
                onClick={() => f.setValores((v) => ({ ...v, cor }))}>
                {f.valores.cor === cor && <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </button>
            ))}
          </div>
        </div>
        <div className="previa-cat" style={{ gridColumn: '1 / -1' }}>
          <span className="cat-icone" style={{ background: f.valores.cor }}>{(f.valores.nome.trim() || '?').slice(0, 1).toUpperCase()}</span>
          <span className="cat-nome"><span><strong>{f.valores.nome.trim() || 'Nome da categoria'}</strong><small>{tipo === 'DESPESA' ? 'despesa' : 'receita'}{f.valores.essencial ? ' · essencial' : ''}</small></span></span>
        </div>
        {tipo === 'DESPESA' && <Interruptor largo {...f.marcar('essencial')} rotulo="Essencial" descricao="Moradia, mercado, saúde… A análise não sugere cortar essenciais." />}
      </Modal>
    </>
  )
}
