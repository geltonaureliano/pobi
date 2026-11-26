import { useState } from 'react'
import { competenciaDe, deslocarCompetencia, diasNoMes, hoje, rotuloCompetencia } from '../shared/data'
import { validarRecorrente, type CamposRecorrente } from '../shared/recorrente'
import { alternarCustoFixo, atualizarCustoFixo, criarCustoFixo, excluirCustoFixo } from '../domain/custo-fixo/repository'
import { lancamentosAGerar, situacaoDosCustos } from '../domain/custo-fixo/rules'
import type { CustoFixo } from '../domain/custo-fixo/model'
import { importarLancamentos } from '../domain/lancamento/repository'

import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { Campo, Vazio, Texto, Data, Moeda, Selecao } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

type Item = CustoFixo
const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',')
const vazio = (): CamposRecorrente => ({ nome: '', valor: '', dia: '', inicio: `${competenciaDe(hoje())}-01`, fim: '', conta_id: '', cartao_id: '', categoria_id: '', observacao: '' })

/** Formulário de custo fixo. */
function useRecorrente(dados: Dados, recarregar: () => void) {
  const [editando, setEditando] = useState<number | 'novo' | null>(null)
  const form = useForm<CamposRecorrente>(vazio())
  function abrir(i?: Item) {
    form.reiniciar(i ? {
      nome: i.nome, valor: reais(i.valor), dia: String(i.dia_vencimento ?? ''),
      inicio: i.inicio, fim: i.fim ?? '', conta_id: i.conta_id ? String(i.conta_id) : '', cartao_id: i.cartao_id ? String(i.cartao_id) : '',
      categoria_id: i.categoria_id ? String(i.categoria_id) : '', observacao: i.observacao ?? '',
    } : { ...vazio(), conta_id: String(dados.contas.find((x) => x.principal)?.id ?? '') })
    setEditando(i ? i.id : 'novo')
  }
  async function salvar() {
    const r = validarRecorrente(form.valores, true)
    if (!r.ok) return form.setErros(r.erros)
    const v = r.valor
    const d = { nome: v.nome, valor: v.valor, dia_vencimento: v.dia, inicio: v.inicio, fim: v.fim, conta_id: v.conta_id, cartao_id: v.cartao_id, categoria_id: v.categoria_id, observacao: v.observacao }
    if (editando === 'novo') await criarCustoFixo(d); else if (editando != null) await atualizarCustoFixo(editando, d)
    setEditando(null); recarregar()
  }
  const cats = dados.categorias.filter((k) => k.tipo === 'DESPESA')
  const modal = (
    <Modal titulo={`${editando === 'novo' ? 'Nova' : 'Editar'} custo fixo`} aberto={editando != null} fechar={() => setEditando(null)} largura={620} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
      <Campo rotulo="Nome" erro={form.erros.nome} largo><Texto autoFocus placeholder="Aluguel, internet, academia…" {...form.campo('nome')} /></Campo>
      <Campo rotulo="Valor mensal" erro={form.erros.valor}><Moeda {...form.campo('valor')} /></Campo>
      <Campo rotulo="Dia do vencimento" erro={form.erros.dia}><Texto placeholder="opcional" numerico maxLength={2} {...form.campo('dia')} /></Campo>
      <Campo rotulo="Início" erro={form.erros.inicio}><Data {...form.campo('inicio')} /></Campo>
      <Campo rotulo="Fim (vazio = sem fim)" erro={form.erros.fim}><Data {...form.campo('fim')} /></Campo>
      <Campo rotulo="Categoria"><Selecao {...form.campo('categoria_id')} itens={cats} /></Campo>
      <Campo rotulo="Conta"><Selecao {...form.campo('conta_id')} itens={dados.contas.filter((x) => !x.arquivada)} /></Campo>
      {<Campo rotulo="Ou cartão" erro={form.erros.cartao_id}><Selecao {...form.campo('cartao_id')} itens={dados.cartoes.filter((x) => !x.arquivado)} /></Campo>}
      <Campo rotulo="Observação" largo><Texto {...form.campo('observacao')} /></Campo>
    </Modal>
  )
  return { abrir, modal }
}

const vigencia = (i: Item) => `${i.inicio.split('-').reverse().join('/')}${i.fim ? ` até ${i.fim.split('-').reverse().join('/')}` : ' · sem fim'}`

export function CustosFixos({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [c, setC] = useState(competenciaDe(hoje()))
  const [gerando, setGerando] = useState(false)
  const { abrir, modal } = useRecorrente(dados, recarregar)
  const situacoes = situacaoDosCustos(dados.custosFixos, dados.lancamentos, c)
  const sit = new Map(situacoes.map((s) => [s.custo.id, s.situacao]))
  const aGerar = lancamentosAGerar(dados.custosFixos, dados.lancamentos, c)
  const total = situacoes.reduce((s, x) => s + x.custo.valor, 0)
  const pagos = situacoes.filter((s) => s.situacao === 'pago')

  return (
    <>
      <div className="topo">
        <h1>Custos fixos</h1>
        <div className="abas">
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, -1))}>←</button>
          <button className="aba ativa">{rotuloCompetencia(c)}</button>
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, 1))}>→</button>
        </div>
      </div>
      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card"><h3>Total do mês</h3><div className="valor"><Dinheiro valor={total} animar /></div></div>
        <div className="card"><h3>Pagos</h3><div className="valor pos">{pagos.length} de {situacoes.length}</div></div>
        <div className="card"><h3>Faltam pagar</h3><div className="valor"><Dinheiro valor={total - pagos.reduce((s, x) => s + x.custo.valor, 0)} animar /></div></div>
      </div>
      <div className="secao">
        <div className="secao-topo">
          <h3>{dados.custosFixos.length} custos cadastrados</h3>
          <div className="acoes">
            <button className="botao secundario" disabled={!aGerar.length} onClick={() => setGerando(true)}>Gerar lançamentos do mês{aGerar.length ? ` (${aGerar.length})` : ''}</button>
            <button className="botao" onClick={() => abrir()}>Novo custo fixo</button>
          </div>
        </div>
        {dados.custosFixos.length ? (
          <table className="tabela">
            <thead><tr><th>Custo</th><th>Vigência</th><th>Vence</th><th>Sai de</th><th>Situação no mês</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
            <tbody>
              {dados.custosFixos.map((cf) => {
                const s = sit.get(cf.id)
                return (
                  <tr key={cf.id} style={{ opacity: cf.ativo ? 1 : 0.5 }}>
                    <td>{cf.nome} {!cf.ativo && <span className="tag">pausado</span>}<div className="sutil">{dados.categorias.find((k) => k.id === cf.categoria_id)?.nome}</div></td>
                    <td className="sutil">{vigencia(cf)}</td>
                    <td className="sutil">{cf.dia_vencimento ? `dia ${Math.min(cf.dia_vencimento, diasNoMes(c))}` : '—'}</td>
                    <td className="sutil">{cf.cartao_id ? dados.cartoes.find((x) => x.id === cf.cartao_id)?.nome : dados.contas.find((x) => x.id === cf.conta_id)?.nome ?? '—'}</td>
                    <td>{s ? <span className={`tag ${s === 'pago' ? 'bom' : s === 'pendente' ? 'laranja' : ''}`}>{s === 'faltando' ? 'não lançado' : s}</span> : <span className="sutil">fora da vigência</span>}</td>
                    <td className="num"><Dinheiro valor={cf.valor} /></td>
                    <td><div className="acoes">
                      <button className="aba" onClick={async () => { await alternarCustoFixo(cf.id, !cf.ativo); recarregar() }}>{cf.ativo ? 'pausar' : 'reativar'}</button>
                      <button className="aba" onClick={() => abrir(cf)}>editar</button>
                      <BotaoExcluir onConfirmar={async () => { await excluirCustoFixo(cf.id); recarregar() }} />
                    </div></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : <Vazio>Cadastre aluguel, internet, assinaturas… O app avisa o que falta pagar em cada mês.</Vazio>}
      </div>
      <Modal titulo={`Gerar lançamentos de ${rotuloCompetencia(c)}`} aberto={gerando} fechar={() => setGerando(false)} largura={560}
        rodape={<button className="botao" onClick={async () => { await importarLancamentos(aGerar); setGerando(false); recarregar() }}>Criar {aGerar.length} lançamentos pendentes</button>}>
        <div style={{ gridColumn: '1 / -1' }}>
          <p className="sutil" style={{ marginTop: 0 }}>Serão criados como <b>pendentes</b>, na data de vencimento. Depois é só marcar como pago em Lançamentos. Custos já lançados no mês ficam de fora.</p>
          {aGerar.map((l) => (
            <div className="item-lista" key={l.id_externo}><span>{l.descricao} <span className="sutil">· {l.data.split('-').reverse().join('/')}</span></span><strong><Dinheiro valor={l.valor} /></strong></div>
          ))}
          <p className="sutil">{situacoes.length - aGerar.length} já lançados neste mês.</p>
        </div>
      </Modal>
      {modal}
    </>
  )
}
