import { useState } from 'react'
import { competenciaDe, dataNoMes, deslocarCompetencia, diasNoMes, hoje, rotuloCompetencia } from '../shared/data'
import { validarRecorrente, type CamposRecorrente } from '../shared/recorrente'
import { alternarReceita, atualizarReceita, criarReceita, excluirReceita } from '../domain/receita/repository'
import { ativaNaCompetencia, totalPrevisto } from '../domain/receita/rules'
import type { Receita } from '../domain/receita/model'
import { alternarCustoFixo, atualizarCustoFixo, criarCustoFixo, excluirCustoFixo } from '../domain/custo-fixo/repository'
import { lancamentosAGerar, situacaoDosCustos } from '../domain/custo-fixo/rules'
import type { CustoFixo } from '../domain/custo-fixo/model'
import { criarLancamento, importarLancamentos } from '../domain/lancamento/repository'

import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { EscolhaCadastro } from '../ui/components/EscolhaCadastro'
import { Assistente } from './assistente/Assistente'
import { CamposReceitaForm } from './assistente/formularios'
import { Campo, Vazio, Texto, Data, Moeda, Selecao } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

type Item = Receita | CustoFixo
const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',')
const vazio = (): CamposRecorrente => ({ nome: '', valor: '', dia: '', inicio: `${competenciaDe(hoje())}-01`, fim: '', conta_id: '', cartao_id: '', categoria_id: '', observacao: '', tipo_valor: 'FIXA', valor_min: '', valor_max: '', fonte: '' })

/** Formulário compartilhado por receitas e custos fixos. */
function useRecorrente(tipo: 'receita' | 'custo', dados: Dados, recarregar: () => void) {
  const [editando, setEditando] = useState<number | 'novo' | null>(null)
  const form = useForm<CamposRecorrente>(vazio())
  function abrir(i?: Item) {
    form.reiniciar(i ? {
      nome: i.nome, valor: reais(i.valor), dia: String(('dia_recebimento' in i ? i.dia_recebimento : i.dia_vencimento) ?? ''),
      inicio: i.inicio, fim: i.fim ?? '', conta_id: i.conta_id ? String(i.conta_id) : '', cartao_id: 'cartao_id' in i && i.cartao_id ? String(i.cartao_id) : '',
      categoria_id: i.categoria_id ? String(i.categoria_id) : '', observacao: i.observacao ?? '',
      ...('tipo_valor' in i ? { tipo_valor: i.tipo_valor ?? 'FIXA', valor_min: i.valor_min ? reais(i.valor_min) : '', valor_max: i.valor_max ? reais(i.valor_max) : '', fonte: i.fonte ?? '' } : {}),
    } : { ...vazio(), conta_id: String(dados.contas.find((x) => x.principal)?.id ?? '') })
    setEditando(i ? i.id : 'novo')
  }
  async function salvar() {
    const r = validarRecorrente(form.valores, tipo === 'custo')
    if (!r.ok) return form.setErros(r.erros)
    const v = r.valor
    if (tipo === 'receita') {
      const d = { nome: v.nome, valor: v.valor, dia_recebimento: v.dia, inicio: v.inicio, fim: v.fim, conta_id: v.conta_id, categoria_id: v.categoria_id, observacao: v.observacao, tipo_valor: v.tipo_valor, valor_min: v.valor_min, valor_max: v.valor_max, fonte: v.fonte }
      if (editando === 'novo') await criarReceita(d); else if (editando != null) await atualizarReceita(editando, d)
    } else {
      const d = { nome: v.nome, valor: v.valor, dia_vencimento: v.dia, inicio: v.inicio, fim: v.fim, conta_id: v.conta_id, cartao_id: v.cartao_id, categoria_id: v.categoria_id, observacao: v.observacao }
      if (editando === 'novo') await criarCustoFixo(d); else if (editando != null) await atualizarCustoFixo(editando, d)
    }
    setEditando(null); recarregar()
  }
  const cats = dados.categorias.filter((k) => k.tipo === (tipo === 'receita' ? 'RECEITA' : 'DESPESA'))
  const modal = (
    <Modal titulo={`${editando === 'novo' ? 'Nova' : 'Editar'} ${tipo === 'receita' ? 'receita' : 'custo fixo'}`} aberto={editando != null} fechar={() => setEditando(null)} largura={tipo === 'receita' ? 660 : 620} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
      {tipo === 'receita' ? <CamposReceitaForm f={form} foco categorias={dados.categorias} contas={dados.contas.filter((x) => !x.arquivada)} /> : <>
      <Campo rotulo="Nome" erro={form.erros.nome} largo><Texto autoFocus placeholder="Aluguel, internet, academia…" {...form.campo('nome')} /></Campo>
      <Campo rotulo="Valor mensal" erro={form.erros.valor}><Moeda {...form.campo('valor')} /></Campo>
      <Campo rotulo="Dia do vencimento" erro={form.erros.dia}><Texto placeholder="opcional" numerico maxLength={2} {...form.campo('dia')} /></Campo>
      <Campo rotulo="Início" erro={form.erros.inicio}><Data {...form.campo('inicio')} /></Campo>
      <Campo rotulo="Fim (vazio = sem fim)" erro={form.erros.fim}><Data {...form.campo('fim')} /></Campo>
      <Campo rotulo="Categoria"><Selecao {...form.campo('categoria_id')} itens={cats} /></Campo>
      <Campo rotulo="Conta"><Selecao {...form.campo('conta_id')} itens={dados.contas.filter((x) => !x.arquivada)} /></Campo>
      {tipo === 'custo' && <Campo rotulo="Ou cartão" erro={form.erros.cartao_id}><Selecao {...form.campo('cartao_id')} itens={dados.cartoes.filter((x) => !x.arquivado)} /></Campo>}
      <Campo rotulo="Observação" largo><Texto {...form.campo('observacao')} /></Campo>
      </>}
    </Modal>
  )
  return { abrir, modal }
}

const vigencia = (i: Item) => `${i.inicio.split('-').reverse().join('/')}${i.fim ? ` até ${i.fim.split('-').reverse().join('/')}` : ' · sem fim'}`

export function Receitas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const c = competenciaDe(hoje())
  const { abrir, modal } = useRecorrente('receita', dados, recarregar)
  const [escolhendo, setEscolhendo] = useState(false)
  const [comIA, setComIA] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const prevista = totalPrevisto(dados.receitas, c)
  const recebido = dados.lancamentos.filter((l) => l.tipo === 'RECEITA' && l.status === 'PAGO' && competenciaDe(l.data) === c).reduce((s, l) => s + l.valor, 0)
  const recebidaNoMes = (r: Receita) => dados.lancamentos.some((l) => l.id_externo === `receita:${r.id}:${c}`)

  async function registrar(r: Receita) {
    await criarLancamento({
      descricao: r.nome, valor: r.valor, tipo: 'RECEITA', status: 'PAGO', data: r.dia_recebimento ? dataNoMes(c, r.dia_recebimento) : hoje(),
      conta_id: r.conta_id ?? dados.contas.find((x) => x.principal)?.id ?? null, conta_destino_id: null, cartao_id: null,
      categoria_id: r.categoria_id, observacao: null, origem: 'RECORRENTE', id_externo: `receita:${r.id}:${c}`,
    })
    recarregar()
  }

  if (comIA) {
    return <Assistente alvo="receita" dados={dados} voltar={() => setComIA(false)} concluir={(msg) => { setComIA(false); setAviso(msg); recarregar() }} />
  }

  return (
    <>
      <div className="topo"><h1>Receitas</h1><button className="botao" onClick={() => setEscolhendo(true)}>Nova receita</button></div>
      {aviso && <div className="secao"><div className="aviso sucesso">{aviso}</div></div>}
      <EscolhaCadastro aberto={escolhendo} fechar={() => setEscolhendo(false)} titulo="Nova receita" item="da receita"
        manual={() => { setEscolhendo(false); abrir() }} ia={() => { setEscolhendo(false); setComIA(true) }} />
      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card"><h3>Prevista em {rotuloCompetencia(c)}</h3><div className="valor"><Dinheiro valor={prevista} animar /></div></div>
        <div className="card"><h3>Recebido no mês</h3><div className="valor pos"><Dinheiro valor={recebido} animar tom="pos" /></div></div>
        <div className="card"><h3>Fontes ativas</h3><div className="valor">{dados.receitas.filter((r) => r.ativa && ativaNaCompetencia(r, c)).length}</div></div>
      </div>
      <div className="secao">
        {dados.receitas.length ? (
          <table className="tabela">
            <thead><tr><th>Receita</th><th>Vigência</th><th>Dia</th><th>Categoria</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
            <tbody>
              {dados.receitas.map((r) => (
                <tr key={r.id} style={{ opacity: r.ativa ? 1 : 0.5 }}>
                  <td>
                    {r.nome} {r.tipo_valor === 'VARIAVEL' && <span className="tag laranja">variável</span>} {r.origem === 'IA' && <span className="tag ia">IA</span>} {!r.ativa && <span className="tag">pausada</span>} {recebidaNoMes(r) && <span className="tag bom">recebida</span>}
                    {r.fonte && <div className="sutil">{r.fonte}</div>}
                  </td>
                  <td className="sutil">{vigencia(r)}</td>
                  <td className="sutil">{r.dia_recebimento ?? '—'}</td>
                  <td className="sutil">{dados.categorias.find((k) => k.id === r.categoria_id)?.nome ?? '—'}</td>
                  <td className="num pos">
                    <Dinheiro valor={r.valor} tom="pos" />
                    {r.tipo_valor === 'VARIAVEL' && (r.valor_min || r.valor_max) ? <div className="sutil faixa-tabela">{r.valor_min ? <Dinheiro valor={r.valor_min} tom="neutro" /> : '—'} a {r.valor_max ? <Dinheiro valor={r.valor_max} tom="neutro" /> : '—'}</div> : null}
                  </td>
                  <td><div className="acoes">
                    {r.ativa && ativaNaCompetencia(r, c) && !recebidaNoMes(r) && <button className="aba ativa" onClick={() => registrar(r)}>registrar recebimento</button>}
                    <button className="aba" onClick={async () => { await alternarReceita(r.id, !r.ativa); recarregar() }}>{r.ativa ? 'pausar' : 'reativar'}</button>
                    <button className="aba" onClick={() => abrir(r)}>editar</button>
                    <BotaoExcluir onConfirmar={async () => { await excluirReceita(r.id); recarregar() }} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vazio>Cadastre suas fontes de renda (salário, freelas fixos) para o app prever o mês.</Vazio>}
      </div>
      {modal}
    </>
  )
}

export function CustosFixos({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [c, setC] = useState(competenciaDe(hoje()))
  const [gerando, setGerando] = useState(false)
  const { abrir, modal } = useRecorrente('custo', dados, recarregar)
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
