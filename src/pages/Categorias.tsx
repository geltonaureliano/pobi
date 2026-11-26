import { useMemo, useState } from 'react'
import { formatarBRL } from '../shared/dinheiro'
import { competenciaDe, hoje } from '../shared/data'
import { atualizarCategoria, criarCategoria, excluirCategoria } from '../domain/categoria/repository'
import type { Categoria, TipoCategoria } from '../domain/categoria/model'
import { despesaPorCategoria } from '../domain/lancamento/rules'
import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { Campo, Texto, Interruptor } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import type { Dados } from '../ui/useDados'

const CORES = ['#EA9A19', '#1C1C1C', '#C9412E', '#1F9D55', '#3B6FD4', '#8E5BD1', '#D45B9A', '#2AA3A3', '#A39A5B', '#77756C']

export function Categorias({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [tipo, setTipo] = useState<TipoCategoria>('DESPESA')
  const [editando, setEditando] = useState<Categoria | 'nova' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const f = useForm({ nome: '', essencial: false, cor: CORES[0] })
  const uso = useMemo(() => {
    const m = new Map<number, number>()
    dados.lancamentos.forEach((l) => l.categoria_id && m.set(l.categoria_id, (m.get(l.categoria_id) ?? 0) + 1))
    return m
  }, [dados])
  const doMes = despesaPorCategoria(dados.lancamentos, competenciaDe(hoje()))
  const lista = dados.categorias.filter((k) => k.tipo === tipo)

  function abrir(k?: Categoria) {
    f.reiniciar(k ? { nome: k.nome, essencial: !!k.essencial, cor: k.cor ?? CORES[0] } : { nome: '', essencial: false, cor: CORES[0] })
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
    setEditando(null); recarregar()
  }

  return (
    <>
      <div className="topo">
        <h1>Categorias</h1>
        <div className="acoes">
          <div className="abas">
            <button className={`aba ${tipo === 'DESPESA' ? 'ativa' : ''}`} onClick={() => setTipo('DESPESA')}>Despesas</button>
            <button className={`aba ${tipo === 'RECEITA' ? 'ativa' : ''}`} onClick={() => setTipo('RECEITA')}>Receitas</button>
          </div>
          <button className="botao" onClick={() => abrir()}>Nova categoria</button>
        </div>
      </div>
      <div className="secao">
        {aviso && <div className="aviso">{aviso}</div>}
        <div className="grade-cards">
          {lista.map((k) => (
            <div className="mini-card" key={k.id}>
              <div className="linha-topo">
                <span><i className="bolinha" style={{ background: k.cor ?? '#d9d6c8' }} /><strong>{k.nome}</strong></span>
                {k.essencial ? <span className="tag laranja">essencial</span> : null}
              </div>
              <span className="sutil">{uso.get(k.id) ?? 0} lançamentos{tipo === 'DESPESA' && ` · ${formatarBRL(doMes.find((x) => x.categoria_id === k.id)?.valor ?? 0)} este mês`}</span>
              <div className="acoes" style={{ justifyContent: 'flex-start' }}>
                <button className="aba" onClick={() => abrir(k)}>editar</button>
                <BotaoExcluir onConfirmar={async () => {
                  const r = await excluirCategoria(k.id)
                  setAviso(r === 'em-uso' ? `${k.nome} está em uso (lançamentos, orçamentos ou recorrentes) e não foi excluída.` : null)
                  recarregar()
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <Modal titulo={editando === 'nova' ? 'Nova categoria' : 'Editar categoria'} aberto={editando != null} fechar={() => setEditando(null)} largura={480} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
        <Campo rotulo="Nome" erro={f.erros.nome} largo><Texto autoFocus {...f.campo('nome')} /></Campo>
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="sutil" style={{ marginBottom: 8 }}>Cor</div>
          <div className="acoes" style={{ justifyContent: 'flex-start' }}>
            {CORES.map((c) => (
              <button key={c} aria-label={c} onClick={() => f.setValores((v) => ({ ...v, cor: c }))}
                style={{ width: 26, height: 26, borderRadius: 8, background: c, border: f.valores.cor === c ? '3px solid #EDECE1' : '0', outline: f.valores.cor === c ? `2px solid ${c}` : 'none' }} />
            ))}
          </div>
        </div>
        {tipo === 'DESPESA' && <Interruptor largo {...f.marcar('essencial')} rotulo="Essencial" descricao="Moradia, mercado, saúde… A análise não sugere cortar essenciais." />}
      </Modal>
    </>
  )
}
