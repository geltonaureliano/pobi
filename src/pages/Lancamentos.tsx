import { useMemo, useState } from 'react'
import { formatarBRL } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../shared/data'
import { validarLancamento, type CamposLancamento, type Erros } from '../domain/lancamento/form'
import { criarLancamento, excluirLancamento, importarLancamentos } from '../domain/lancamento/repository'
import { lerCSV } from '../domain/lancamento/importacao'
import { totaisDaCompetencia } from '../domain/lancamento/rules'
import type { Dados } from '../ui/useDados'

const vazio = (): CamposLancamento => ({
  descricao: '', valor: '', tipo: 'DESPESA', data: hoje(), conta_id: '', conta_destino_id: '', cartao_id: '', categoria_id: '', pendente: false,
})

export function Lancamentos({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [c, setC] = useState(competenciaDe(hoje()))
  const [f, setF] = useState<CamposLancamento>(vazio)
  const [erros, setErros] = useState<Erros<CamposLancamento>>({})
  const [aviso, setAviso] = useState<string | null>(null)
  const lista = useMemo(() => dados.lancamentos.filter((l) => l.data.startsWith(c)), [dados, c])
  const t = totaisDaCompetencia(dados.lancamentos, c)
  const set = (k: keyof CamposLancamento) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const cats = dados.categorias.filter((k) => k.tipo === (f.tipo === 'RECEITA' ? 'RECEITA' : 'DESPESA'))

  async function salvar() {
    const r = validarLancamento(f)
    if (!r.ok) return setErros(r.erros)
    await criarLancamento(r.valor)
    setErros({})
    setF({ ...vazio(), tipo: f.tipo, conta_id: f.conta_id, cartao_id: f.cartao_id })
    recarregar()
  }

  async function importar(arquivo: File) {
    const conta = Number(f.conta_id || dados.contas[0]?.id)
    if (!conta) return setAviso('Cadastre uma conta antes de importar.')
    const r = lerCSV(await arquivo.text(), conta)
    const n = await importarLancamentos(
      r.linhas.map((l) => ({ ...l, status: 'PAGO', conta_id: conta, conta_destino_id: null, cartao_id: null, categoria_id: null, observacao: null })),
    )
    setAviso(`${n} lançamentos importados, ${r.linhas.length - n} já existiam, ${r.ignoradas.length} linhas ignoradas.`)
    recarregar()
  }

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
        <div className="card"><h3>Lançamentos</h3><div className="valor">{lista.length}</div></div>
      </div>
      <div className="secao">
        <div className="secao-topo">
          <h3>Novo lançamento</h3>
          <label className="botao secundario">Importar CSV<input type="file" accept=".csv,text/csv" hidden onChange={(e) => e.target.files?.[0] && importar(e.target.files[0])} /></label>
        </div>
        {aviso && <div className="aviso">{aviso}</div>}
        <div className="form">
          <label className="campo">Tipo
            <select value={f.tipo} onChange={set('tipo')}>
              <option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option><option value="TRANSFERENCIA">Transferência</option>
            </select>
          </label>
          <label className="campo">Descrição<input value={f.descricao} onChange={set('descricao')} />{erros.descricao && <span className="erro">{erros.descricao}</span>}</label>
          <label className="campo">Valor (R$)<input value={f.valor} onChange={set('valor')} placeholder="0,00" />{erros.valor && <span className="erro">{erros.valor}</span>}</label>
          <label className="campo">Data<input type="date" value={f.data} onChange={set('data')} />{erros.data && <span className="erro">{erros.data}</span>}</label>
          <label className="campo">{f.tipo === 'TRANSFERENCIA' ? 'Conta de origem' : 'Conta'}
            <select value={f.conta_id} onChange={set('conta_id')}><option value="">—</option>{dados.contas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
            {erros.conta_id && <span className="erro">{erros.conta_id}</span>}
          </label>
          {f.tipo === 'TRANSFERENCIA' ? (
            <label className="campo">Conta de destino
              <select value={f.conta_destino_id} onChange={set('conta_destino_id')}><option value="">—</option>{dados.contas.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
              {erros.conta_destino_id && <span className="erro">{erros.conta_destino_id}</span>}
            </label>
          ) : (
            <>
              {f.tipo === 'DESPESA' && (
                <label className="campo">Cartão
                  <select value={f.cartao_id} onChange={set('cartao_id')}><option value="">—</option>{dados.cartoes.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
                </label>
              )}
              <label className="campo">Categoria
                <select value={f.categoria_id} onChange={set('categoria_id')}><option value="">—</option>{cats.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
              </label>
            </>
          )}
          <button className="botao" onClick={salvar}>Adicionar</button>
        </div>
      </div>
      <div className="secao">
        <table className="tabela">
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Origem</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
          <tbody>
            {lista.map((l) => (
              <tr key={l.id} style={{ opacity: l.status === 'PAGO' ? 1 : 0.55 }}>
                <td>{l.data.split('-').reverse().slice(0, 2).join('/')}</td>
                <td>{l.descricao}{l.status === 'PENDENTE' && <span className="sutil"> · pendente</span>}</td>
                <td className="sutil">{l.categoria_nome ?? '—'}</td>
                <td className="sutil">{l.cartao_id ? dados.cartoes.find((x) => x.id === l.cartao_id)?.nome : dados.contas.find((x) => x.id === l.conta_id)?.nome}</td>
                <td className={`num ${l.tipo === 'RECEITA' ? 'pos' : 'neg'}`}>{l.tipo === 'RECEITA' ? '+' : l.tipo === 'DESPESA' ? '−' : '⇄'} {formatarBRL(l.valor)}</td>
                <td className="num"><button className="aba" onClick={async () => { await excluirLancamento(l.id); recarregar() }}>excluir</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!lista.length && <p className="sutil">Nenhum lançamento neste mês.</p>}
      </div>
    </>
  )
}
