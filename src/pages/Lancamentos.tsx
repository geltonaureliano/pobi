import { useMemo, useState } from 'react'
import { formatarBRL } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../shared/data'
import { validarLancamento, type CamposLancamento } from '../domain/lancamento/form'
import { atualizarLancamento, criarLancamento, excluirLancamentoComVinculos, importarLancamentos } from '../domain/lancamento/repository'
import { lerCSV } from '../domain/lancamento/importacao'
import { totaisDaCompetencia } from '../domain/lancamento/rules'
import type { LancamentoDetalhado } from '../domain/lancamento/model'
import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { Campo, Vazio, Texto, Busca, Data, Moeda, Selecao, MultiSelecao, Segmentos, Interruptor } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import type { Dados } from '../ui/useDados'

const vazio = (): CamposLancamento => ({
  descricao: '', valor: '', tipo: 'DESPESA', data: hoje(), conta_id: '', conta_destino_id: '', cartao_id: '', categoria_id: '', pendente: false,
})
const paraCampos = (l: LancamentoDetalhado): CamposLancamento => ({
  descricao: l.descricao, valor: (l.valor / 100).toFixed(2).replace('.', ','), tipo: l.tipo, data: l.data,
  conta_id: l.conta_id ? String(l.conta_id) : '', conta_destino_id: l.conta_destino_id ? String(l.conta_destino_id) : '',
  cartao_id: l.cartao_id ? String(l.cartao_id) : '', categoria_id: l.categoria_id ? String(l.categoria_id) : '', pendente: l.status === 'PENDENTE',
})

export function Lancamentos({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [c, setC] = useState(competenciaDe(hoje()))
  const [busca, setBusca] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fCat, setFCat] = useState<string[]>([])
  const [fOrigem, setFOrigem] = useState('')
  const [editando, setEditando] = useState<number | 'novo' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const form = useForm<CamposLancamento>(vazio())
  const f = form.valores

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return dados.lancamentos.filter((l) =>
      l.data.startsWith(c) &&
      (!q || l.descricao.toLowerCase().includes(q) || (l.categoria_nome ?? '').toLowerCase().includes(q)) &&
      (!fTipo || (fTipo === 'PENDENTE' ? l.status === 'PENDENTE' : l.tipo === fTipo)) &&
      (!fCat.length || fCat.includes(String(l.categoria_id))) &&
      (!fOrigem || (fOrigem.startsWith('k') ? `k${l.cartao_id}` === fOrigem : `c${l.conta_id}` === fOrigem && !l.cartao_id)))
  }, [dados, c, busca, fTipo, fCat, fOrigem])
  const t = totaisDaCompetencia(dados.lancamentos, c)
  const pendentes = dados.lancamentos.filter((l) => l.data.startsWith(c) && l.status === 'PENDENTE')
  const cats = dados.categorias.filter((k) => k.tipo === (f.tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA'))
  const contasAtivas = dados.contas.filter((x) => !x.arquivada)
  const cartoesAtivos = dados.cartoes.filter((x) => !x.arquivado)

  function abrir(l?: LancamentoDetalhado) {
    form.reiniciar(l ? paraCampos(l) : { ...vazio(), conta_id: String(contasAtivas.find((x) => x.principal)?.id ?? '') })
    setEditando(l ? l.id : 'novo')
  }
  async function salvar(continuar = false) {
    const r = validarLancamento(f)
    if (!r.ok) return form.setErros(r.erros)
    if (editando === 'novo') await criarLancamento(r.valor)
    else if (editando != null) await atualizarLancamento(editando, r.valor)
    recarregar()
    if (continuar) form.reiniciar({ ...vazio(), tipo: f.tipo, data: f.data, conta_id: f.conta_id, cartao_id: f.cartao_id })
    else setEditando(null)
  }
  async function marcarPago(l: LancamentoDetalhado) {
    await atualizarLancamento(l.id, { ...l, status: 'PAGO' })
    recarregar()
  }
  async function importar(arquivo: File) {
    const conta = Number(contasAtivas.find((x) => x.principal)?.id ?? contasAtivas[0]?.id)
    if (!conta) return setAviso('Cadastre uma conta antes de importar.')
    const r = lerCSV(await arquivo.text(), conta)
    const n = await importarLancamentos(
      r.linhas.map((l) => ({ ...l, status: 'PAGO', conta_id: conta, conta_destino_id: null, cartao_id: null, categoria_id: null, observacao: null })),
    )
    setAviso(`${n} lançamentos importados na conta principal, ${r.linhas.length - n} já existiam, ${r.ignoradas.length} linhas ignoradas.${r.ignoradas.length ? ' ' + r.ignoradas.slice(0, 3).map((i) => `linha ${i.linha}: ${i.motivo}`).join('; ') : ''}`)
    recarregar()
  }
  const origem = (l: LancamentoDetalhado) =>
    l.tipo === 'TRANSFERENCIA'
      ? `${dados.contas.find((x) => x.id === l.conta_id)?.nome} → ${dados.contas.find((x) => x.id === l.conta_destino_id)?.nome}`
      : l.cartao_id ? dados.cartoes.find((x) => x.id === l.cartao_id)?.nome : dados.contas.find((x) => x.id === l.conta_id)?.nome

  return (
    <>
      <div className="topo">
        <h1>Lançamentos</h1>
        <div className="abas">
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, -1))}>←</button>
          <button className="aba ativa">{rotuloCompetencia(c)}</button>
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, 1))}>→</button>
        </div>
      </div>
      <div className="cards">
        <div className="card"><h3>Receitas</h3><div className="valor pos">{formatarBRL(t.receitas)}</div></div>
        <div className="card"><h3>Despesas</h3><div className="valor">{formatarBRL(t.despesas)}</div></div>
        <div className="card"><h3>Resultado</h3><div className="valor">{formatarBRL(t.resultado)}</div></div>
        <div className="card"><h3>Pendentes</h3><div className="valor">{pendentes.length}</div><span className="sutil">{formatarBRL(pendentes.reduce((s, l) => s + l.valor, 0))}</span></div>
      </div>
      <div className="secao">
        <div className="secao-topo">
          <h3>{lista.length} lançamentos</h3>
          <div className="acoes">
            <label className="botao secundario">Importar CSV<input type="file" accept=".csv,text/csv" hidden onChange={(e) => { if (e.target.files?.[0]) importar(e.target.files[0]); e.target.value = '' }} /></label>
            <button className="botao" onClick={() => abrir()}>Novo lançamento</button>
          </div>
        </div>
        {aviso && <div className="aviso">{aviso}</div>}
        <div className="filtros">
          <Busca value={busca} onChange={setBusca} placeholder="Buscar descrição ou categoria" />
          <Selecao value={fTipo} onChange={setFTipo} vazio="Todos os tipos" itens={[
            { id: 'DESPESA', nome: 'Despesas' }, { id: 'RECEITA', nome: 'Receitas' }, { id: 'TRANSFERENCIA', nome: 'Transferências' }, { id: 'PENDENTE', nome: 'Só pendentes' },
          ]} />
          <MultiSelecao valores={fCat} onChange={setFCat} itens={dados.categorias} placeholder="Todas as categorias" />
          <Selecao value={fOrigem} onChange={setFOrigem} vazio="Contas e cartões" itens={[
            ...dados.contas.map((x) => ({ id: `c${x.id}`, nome: x.nome })),
            ...dados.cartoes.map((x) => ({ id: `k${x.id}`, nome: x.nome, dica: 'cartão' })),
          ]} />
        </div>
        {lista.length ? (
          <table className="tabela">
            <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Conta / cartão</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id} style={{ opacity: l.status === 'CANCELADO' ? 0.4 : 1 }}>
                  <td>{l.data.split('-').reverse().slice(0, 2).join('/')}</td>
                  <td>
                    {l.descricao}{' '}
                    {l.status === 'PENDENTE' && <span className="tag laranja">pendente</span>}{' '}
                    {l.fatura_ref && <span className="tag">fatura</span>}{' '}
                    {l.origem === 'IMPORTACAO' && <span className="tag">importado</span>}
                  </td>
                  <td className="sutil">{l.categoria_nome ?? '—'}</td>
                  <td className="sutil">{origem(l)}</td>
                  <td className={`num ${l.tipo === 'RECEITA' ? 'pos' : 'neg'}`}>{l.tipo === 'RECEITA' ? '+' : l.tipo === 'DESPESA' ? '−' : '⇄'} {formatarBRL(l.valor)}</td>
                  <td>
                    <div className="acoes">
                      {l.status === 'PENDENTE' && <button className="aba ativa" onClick={() => marcarPago(l)}>pagar</button>}
                      {!l.fatura_ref && <button className="aba" onClick={() => abrir(l)}>editar</button>}
                      <BotaoExcluir onConfirmar={async () => { await excluirLancamentoComVinculos(l.id); recarregar() }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vazio>Nenhum lançamento {busca || fTipo || fCat.length || fOrigem ? 'com esses filtros' : 'neste mês'}.</Vazio>}
      </div>

      <Modal
        titulo={editando === 'novo' ? 'Novo lançamento' : 'Editar lançamento'}
        aberto={editando != null}
        fechar={() => setEditando(null)}
        rodape={<>
          {editando === 'novo' && <button className="botao secundario" onClick={() => salvar(true)}>Salvar e adicionar outro</button>}
          <button className="botao" onClick={() => salvar()}>Salvar</button>
        </>}
      >
        <Campo rotulo="Tipo" largo>
          <Segmentos {...form.campo('tipo')} itens={[{ id: 'DESPESA', nome: 'Despesa' }, { id: 'RECEITA', nome: 'Receita' }, { id: 'TRANSFERENCIA', nome: 'Transferência' }]} />
        </Campo>
        <Campo rotulo="Descrição" erro={form.erros.descricao} largo><Texto autoFocus {...form.campo('descricao')} /></Campo>
        <Campo rotulo="Valor" erro={form.erros.valor}><Moeda {...form.campo('valor')} /></Campo>
        <Campo rotulo="Data" erro={form.erros.data}><Data {...form.campo('data')} /></Campo>
        {f.tipo !== 'TRANSFERENCIA' && (
          <Campo rotulo="Categoria"><Selecao {...form.campo('categoria_id')} itens={cats} /></Campo>
        )}
        <Campo rotulo={f.tipo === 'TRANSFERENCIA' ? 'Conta de origem' : 'Conta'} erro={form.erros.conta_id}>
          <Selecao {...form.campo('conta_id')} itens={contasAtivas} />
        </Campo>
        {f.tipo === 'TRANSFERENCIA' ? (
          <Campo rotulo="Conta de destino" erro={form.erros.conta_destino_id}><Selecao {...form.campo('conta_destino_id')} itens={contasAtivas} /></Campo>
        ) : f.tipo === 'DESPESA' ? (
          <Campo rotulo="Cartão (no lugar da conta)" erro={form.erros.cartao_id}><Selecao {...form.campo('cartao_id')} itens={cartoesAtivos} /></Campo>
        ) : <div />}
        <Interruptor largo {...form.marcar('pendente')} rotulo="Ainda não foi pago" descricao="Fica pendente e não entra nos totais até você marcar como pago." />
      </Modal>
    </>
  )
}
