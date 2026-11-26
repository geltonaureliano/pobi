import { useMemo, useState } from 'react'
import { centavosParaTexto, formatarBRL, paraCentavos } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia, rotuloMes } from '../shared/data'
import { criarCartao, excluirFatura, salvarFatura } from '../domain/cartao/repository'
import { cartaoVazio, faturasDoFormulario, validarCartao, type CamposCartao } from '../domain/cartao/form'
import { emAbertoNoCartao, faturaDaCompra, marcaDePagamento, resumoDaFatura, type ResumoFatura } from '../domain/cartao/rules'
import type { Cartao } from '../domain/cartao/model'
import type { ConversaIA } from '../domain/assistente/model'
import { buscarConversa, buscarConversaDoItem } from '../domain/assistente/repository'
import { criarLancamento } from '../domain/lancamento/repository'
import { EscolhaCadastro } from '../ui/components/EscolhaCadastro'
import { Modal, IconeEditar } from '../ui/components/Modal'
import { Campo, Vazio, Data, Moeda, Selecao, Texto } from '../ui/components/Campos'
import { Dinheiro } from '../ui/components/Dinheiro'
import { useForm } from '../ui/useForm'
import { toast } from '../ui/toast'
import type { Dados } from '../ui/useDados'
import { Assistente } from './assistente/Assistente'
import { BotaoConversas, HistoricoConversas } from './assistente/Historico'
import { CamposCartaoForm } from './assistente/formularios'

const br = (d: string) => d.split('-').reverse().join('/')

type Situacao = 'paga' | 'vencida' | 'aberta' | 'parcial' | 'futura' | 'vazia'
function situacaoDe(f: ResumoFatura, atual: string): Situacao {
  if (f.situacao === 'vazia') return 'vazia'
  if (f.situacao === 'paga') return 'paga'
  if (f.vencimento < hoje()) return 'vencida'
  if (f.situacao === 'parcial') return 'parcial'
  return f.fatura > atual ? 'futura' : 'aberta'
}
const ROTULO: Record<Situacao, string> = { paga: 'paga', vencida: 'vencida', aberta: 'aberta', parcial: 'parcial', futura: 'próxima', vazia: 'sem fatura' }

/** Cartões: lista; ao abrir um cartão, as faturas mês a mês. */
export function Cartoes({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [novo, setNovo] = useState(false)
  const [escolhendo, setEscolhendo] = useState(false)
  const [historico, setHistorico] = useState(false)
  const [assistente, setAssistente] = useState<{ conversa: ConversaIA | null; editar: Cartao | null } | null>(null)
  const [abertoId, setAbertoId] = useState<number | null>(null)
  const principal = String(dados.contas.find((x) => x.principal)?.id ?? '')
  const fk = useForm<CamposCartao>(cartaoVazio(principal))
  const ativas = dados.contas.filter((x) => !x.arquivada)
  const cartoes = dados.cartoes.filter((x) => !x.arquivado)
  const arquivados = dados.cartoes.filter((x) => x.arquivado)
  const atual = competenciaDe(hoje())
  const limiteTotal = cartoes.reduce((s, k) => s + k.limite, 0)
  const usadoTotal = cartoes.reduce((s, k) => s + emAbertoNoCartao(k, dados.lancamentos, dados.faturas), 0)

  if (assistente) {
    const { conversa: conv, editar } = assistente
    return <Assistente key={`${editar?.id ?? ''}-${conv?.id ?? 'nova'}`} alvo="cartao" dados={dados} conversa={conv} editar={editar}
      trocar={(x) => setAssistente({ conversa: x, editar: null })}
      voltar={() => setAssistente(null)} concluir={(msg) => { setAssistente(null); toast.sucesso(msg); recarregar() }} />
  }
  /** Editar abre a página do assistente, com o chat ligado a esse cartão. */
  async function editarComChat(k: Cartao) {
    setAssistente({ conversa: await buscarConversaDoItem('cartao', k.id).catch(() => null), editar: k })
  }
  const aberto = dados.cartoes.find((k) => k.id === abertoId)
  if (aberto) return <DetalheCartao cartao={aberto} dados={dados} recarregar={recarregar} voltar={() => setAbertoId(null)} editar={() => editarComChat(aberto)} />

  async function salvarNovo() {
    const r = validarCartao(fk.valores)
    if (!r.ok) return fk.setErros(r.erros)
    const id = await criarCartao(r.valor)
    if (id) for (const x of faturasDoFormulario(fk.valores)) await salvarFatura({ cartao_id: id, competencia: x.competencia, valor: x.valor })
    toast.sucesso('Cartão adicionado', r.valor.nome)
    setNovo(false); recarregar()
  }

  return (
    <>
      <div className="topo">
        <h1>Cartões</h1>
        <div className="acoes">
          <span className="sutil">{cartoes.length ? `em aberto ${formatarBRL(usadoTotal)} de ${formatarBRL(limiteTotal)}` : 'nenhum cartão'}</span>
          <BotaoConversas alvo="cartao" onClick={() => setHistorico(true)} />
          <button className="botao" onClick={() => setEscolhendo(true)}>Novo cartão</button>
        </div>
      </div>
      <HistoricoConversas alvo="cartao" aberto={historico} fechar={() => setHistorico(false)} nova={() => setAssistente({ conversa: null, editar: null })}
        abrir={async (id) => { const x = await buscarConversa(id); if (x) setAssistente({ conversa: x, editar: x.status === 'CONCLUIDA' && x.item_id ? dados.cartoes.find((k) => k.id === x.item_id) ?? null : null }) }} />
      <EscolhaCadastro aberto={escolhendo} fechar={() => setEscolhendo(false)} titulo="Novo cartão" item="do cartão"
        manual={() => { setEscolhendo(false); fk.reiniciar(cartaoVazio(principal)); setNovo(true) }} ia={() => { setEscolhendo(false); setAssistente({ conversa: null, editar: null }) }} />

      <div className="secao">
        {!cartoes.length && <Vazio>Nenhum cartão cadastrado.</Vazio>}
        <div className="grade-cartoes">
          {cartoes.map((k) => {
            const emAberto = emAbertoNoCartao(k, dados.lancamentos, dados.faturas)
            const prox = proximaFatura(k, dados)
            const uso = k.limite ? Math.min(1, emAberto / k.limite) : 0
            return (
              <div key={k.id} className="cartao-tile" role="button" tabIndex={0} onClick={() => setAbertoId(k.id)} onKeyDown={(e) => e.key === 'Enter' && setAbertoId(k.id)}>
                <div className={`cartao-visual ${(k.bandeira ?? '').toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="cartao-visual-topo"><span>{k.emissor ?? k.nome}</span>{k.origem === 'IA' && <span className="tag ia">IA</span>}</div>
                  <i className="cartao-visual-chip" />
                  <div className="cartao-visual-rodape"><span>{k.nome}</span><span>{k.final ? `•••• ${k.final}` : ''}</span></div>
                  <small className="cartao-visual-bandeira">{k.bandeira ?? ''}</small>
                </div>
                <div className="cartao-tile-info">
                  <div className="barra-rotulo"><span>Usado <Dinheiro valor={emAberto} /></span><span className="sutil">livre <Dinheiro valor={k.limite - emAberto} tom="auto" /></span></div>
                  <div className={`barra ${emAberto > k.limite ? 'estourada' : ''}`}><i style={{ width: `${uso * 100}%` }} /></div>
                  {prox ? (
                    <div className="cartao-tile-fatura">
                      <span>Fatura de {rotuloMes(prox.fatura).toLowerCase()} · vence {br(prox.vencimento).slice(0, 5)}</span>
                      <strong><Dinheiro valor={prox.emAberto || prox.total} /></strong>
                      <span className={`tag sit-${situacaoDe(prox, atual)}`}>{ROTULO[situacaoDe(prox, atual)]}</span>
                    </div>
                  ) : <span className="sutil">Sem faturas em aberto</span>}
                </div>
                <button className="botao-icone cartao-tile-editar" onClick={(e) => { e.stopPropagation(); editarComChat(k) }} aria-label={`Editar ${k.nome}`} title="Editar (abre o assistente)"><IconeEditar /></button>
              </div>
            )
          })}
        </div>
        {arquivados.length > 0 && (
          <div className="fora-do-mes">
            <span className="sutil">Arquivados:</span>
            {arquivados.map((k) => (
              <span key={k.id} className="chip-fora">{k.nome}{k.final && <small>•••• {k.final}</small>}
                <button className="botao-icone" onClick={() => editarComChat(k)} aria-label={`Editar ${k.nome}`} title="Editar (abre o assistente)"><IconeEditar /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Modal titulo="Novo cartão" aberto={novo} fechar={() => setNovo(false)} largura={640} rodape={<button className="botao" onClick={salvarNovo}>Salvar</button>}>
        <CamposCartaoForm f={fk} foco contas={ativas} />
      </Modal>
    </>
  )
}

/** Primeira fatura ainda não paga a partir da atual (ou a atual, se tudo estiver pago). */
function proximaFatura(k: Cartao, dados: Dados): ResumoFatura | null {
  const hojeFat = faturaDaCompra(k, hoje())
  for (let i = -2; i <= 12; i++) {
    const f = resumoDaFatura(k, dados.lancamentos, deslocarCompetencia(hojeFat, i), dados.faturas)
    if (f.situacao !== 'vazia' && f.situacao !== 'paga') return f
  }
  return null
}

/** Página do cartão: faturas do ano em grade (como no Quibo) e o detalhe da fatura escolhida. */
function DetalheCartao({ cartao: k, dados, recarregar, voltar, editar }: { cartao: Cartao; dados: Dados; recarregar: () => void; voltar: () => void; editar: () => void }) {
  const atual = faturaDaCompra(k, hoje())
  const [sel, setSel] = useState(atual)
  // Janela de 12 meses: 3 antes da fatura atual e 8 depois; as setas andam 6 meses.
  const [inicio, setInicio] = useState(deslocarCompetencia(atual, -3))
  const [pagando, setPagando] = useState(false)
  const [informando, setInformando] = useState(false)
  const fp = useForm({ conta_id: '', valor: '', data: hoje() })
  const fi = useForm({ valor: '', observacao: '' })
  const ativas = dados.contas.filter((x) => !x.arquivada)

  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => resumoDaFatura(k, dados.lancamentos, deslocarCompetencia(inicio, i), dados.faturas)), [k, dados, inicio])
  const f = resumoDaFatura(k, dados.lancamentos, sel, dados.faturas)
  const sit = situacaoDe(f, atual)
  const emAberto = emAbertoNoCartao(k, dados.lancamentos, dados.faturas)
  const compras = dados.lancamentos.filter((l) => l.cartao_id === k.id && l.tipo === 'DESPESA' && l.status !== 'CANCELADO' && faturaDaCompra(k, l.data) === sel)
  const pagamentos = dados.lancamentos.filter((l) => l.fatura_ref === marcaDePagamento(k.id, sel))
  const informada = dados.faturas.find((x) => x.cartao_id === k.id && x.competencia === sel)
  const proximas = useMemo(() => Array.from({ length: 12 }, (_, i) => resumoDaFatura(k, dados.lancamentos, deslocarCompetencia(atual, i), dados.faturas)).filter((x) => x.total > 0), [k, dados, atual])

  async function pagar() {
    const valor = paraCentavos(fp.valores.valor)
    if (!fp.valores.conta_id || !(valor && valor > 0)) return fp.setErros({ valor: 'Informe conta e valor.' })
    await criarLancamento({
      descricao: `Fatura ${k.nome} ${rotuloCompetencia(sel)}`, valor, tipo: 'DESPESA', status: 'PAGO', data: fp.valores.data,
      conta_id: Number(fp.valores.conta_id), conta_destino_id: null, cartao_id: null, categoria_id: null, observacao: null, fatura_ref: marcaDePagamento(k.id, sel),
    })
    toast.sucesso('Fatura paga', `${k.nome} · ${rotuloCompetencia(sel)}`)
    setPagando(false); recarregar()
  }
  async function informar(limpar = false) {
    if (limpar) { await excluirFatura(k.id, sel); toast.info('Valor informado removido', rotuloCompetencia(sel)) }
    else {
      const valor = paraCentavos(fi.valores.valor)
      if (valor == null || valor < 0) return fi.setErros({ valor: 'Informe o valor da fatura.' })
      await salvarFatura({ cartao_id: k.id, competencia: sel, valor, observacao: fi.valores.observacao.trim() || null })
      toast.sucesso('Fatura atualizada', `${rotuloCompetencia(sel)} · ${formatarBRL(valor)}`)
    }
    setInformando(false); recarregar()
  }

  return (
    <div className="detalhe-cartao">
      <div className="topo">
        <div className="acoes" style={{ justifyContent: 'flex-start', gap: 14 }}>
          <button className="botao-voltar" onClick={voltar}>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Cartões
          </button>
          <div className="cartao-titulo">
            <span className={`cartao-chip ${(k.bandeira ?? '').toLowerCase().replace(/\s+/g, '-')}`} aria-hidden="true" />
            <div>
              <div className="receita-nome"><h1 style={{ margin: 0 }}>{k.nome}</h1>{k.origem === 'IA' && <span className="tag ia">IA</span>}</div>
              <div className="divida-meta">
                {k.emissor && <span>{k.emissor}</span>}{k.bandeira && <span>{k.bandeira}</span>}{k.final && <span>•••• {k.final}</span>}
                <span>fecha dia {k.dia_fechamento}</span><span>vence dia {k.dia_vencimento}</span>
              </div>
            </div>
          </div>
        </div>
        <button className="botao secundario botao-com-icone" onClick={editar}><IconeEditar /> Editar</button>
      </div>

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card"><h3>Limite</h3><div className="valor"><Dinheiro valor={k.limite} animar /></div></div>
        <div className="card"><h3>Em aberto</h3><span className="badge">todas as faturas não pagas</span><div className="valor"><Dinheiro valor={emAberto} animar /></div></div>
        <div className="card"><h3>Disponível</h3><span className={`badge ${k.limite - emAberto < 0 ? 'ruim' : 'bom'}`}>{k.limite ? `${Math.round(((k.limite - emAberto) / k.limite) * 100)}% livre` : '—'}</span><div className="valor"><Dinheiro valor={k.limite - emAberto} animar /></div></div>
      </div>

      <div className="secao">
        <div className="secao-topo">
          <h3>Faturas</h3>
          <div className="mes-nav">
            <button className="aba" onClick={() => setInicio(deslocarCompetencia(inicio, -6))} aria-label="Meses anteriores">←</button>
            <button className="aba ativa" onClick={() => setInicio(deslocarCompetencia(atual, -3))} title="Voltar para a fatura atual">{rotuloCompetencia(inicio).toLowerCase()} – {rotuloCompetencia(deslocarCompetencia(inicio, 11)).toLowerCase()}</button>
            <button className="aba" onClick={() => setInicio(deslocarCompetencia(inicio, 6))} aria-label="Próximos meses">→</button>
          </div>
        </div>
        <div className="grade-faturas">
          {meses.map((m) => {
            const s = situacaoDe(m, atual)
            return (
              <button key={m.fatura} className={`fatura-mes-tile sit-${s} ${m.fatura === sel ? 'sel' : ''} ${m.fatura === atual ? 'atual' : ''}`} onClick={() => setSel(m.fatura)}>
                <strong>{rotuloMes(m.fatura)}{m.fatura.endsWith('-01') || m.fatura === inicio ? <em> {m.fatura.slice(2, 4)}</em> : null}</strong>
                <span className="fatura-valor">{m.total ? <Dinheiro valor={m.total} tom="neutro" /> : '—'}</span>
                <small>{m.fatura === atual ? 'atual' : ROTULO[s]}</small>
              </button>
            )
          })}
        </div>
      </div>

      <div className="secao fatura-detalhe">
        <div className="secao-topo">
          <div>
            <h3>Fatura de {rotuloCompetencia(sel).toLowerCase()}</h3>
            <span className="sutil">fecha {br(f.fechamento)} · vence {br(f.vencimento)}{informada ? ' · valor informado do app do banco' : f.compras ? ' · pelas compras lançadas' : ''}</span>
          </div>
          <div className="acoes">
            <span className={`tag sit-${sit}`}>{ROTULO[sit]}</span>
            <button className="aba" onClick={() => { fi.reiniciar({ valor: informada ? centavosParaTexto(informada.valor) : '', observacao: informada?.observacao ?? '' }); setInformando(true) }}>{informada ? 'editar valor' : 'informar valor'}</button>
            {f.emAberto > 0 && <button className="aba ativa" onClick={() => { fp.reiniciar({ conta_id: String(k.conta_pagamento_id ?? ativas[0]?.id ?? ''), valor: centavosParaTexto(f.emAberto), data: hoje() }); setPagando(true) }}>pagar fatura</button>}
          </div>
        </div>
        <div className="fatura-numeros">
          <div><span>Total</span><strong><Dinheiro valor={f.total} /></strong></div>
          <div><span>Pago</span><strong><Dinheiro valor={f.pago} tom={f.pago ? 'pos' : 'neutro'} /></strong></div>
          <div><span>Em aberto</span><strong><Dinheiro valor={f.emAberto} tom={f.emAberto && sit === 'vencida' ? 'neg' : 'neutro'} /></strong></div>
          {informada && f.compras > 0 && <div><span>Compras lançadas</span><strong><Dinheiro valor={f.compras} tom="neutro" /></strong></div>}
        </div>
        {informada?.observacao && <p className="sutil">{informada.observacao}</p>}
        {compras.length > 0 ? (
          <table className="tabela">
            <thead><tr><th>Data</th><th>Compra</th><th>Categoria</th><th style={{ textAlign: 'right' }}>Valor</th></tr></thead>
            <tbody>{compras.map((l) => <tr key={l.id}><td className="num-esq">{br(l.data).slice(0, 5)}</td><td>{l.descricao}</td><td className="sutil">{l.categoria_nome ?? '—'}</td><td className="num"><Dinheiro valor={l.valor} /></td></tr>)}</tbody>
          </table>
        ) : <p className="sutil" style={{ margin: 0 }}>{informada ? 'Nenhuma compra lançada no Pobi neste ciclo; o total vem do valor informado.' : 'Nenhuma compra neste ciclo.'}</p>}
        {pagamentos.length > 0 && <p className="sutil">Pagamentos: {pagamentos.map((p) => `${br(p.data).slice(0, 5)} ${formatarBRL(p.valor)}`).join(' · ')}</p>}
      </div>

      {proximas.length > 0 && (
        <div className="secao">
          <div className="secao-topo"><h3>Próximas faturas</h3><span className="sutil"><Dinheiro valor={proximas.reduce((t, x) => t + x.emAberto, 0)} /> em aberto</span></div>
          <div className="proximas-faturas">
            {proximas.map((x) => (
              <button key={x.fatura} className={`proxima-fatura ${x.fatura === sel ? 'sel' : ''}`} onClick={() => { setSel(x.fatura); if (x.fatura < inicio || x.fatura > deslocarCompetencia(inicio, 11)) setInicio(deslocarCompetencia(x.fatura, -3)) }}>
                <span>{rotuloCompetencia(x.fatura)}</span>
                <strong><Dinheiro valor={x.total} /></strong>
                <small>vence {br(x.vencimento).slice(0, 5)}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <Modal titulo={`Pagar fatura ${k.nome} · ${rotuloCompetencia(sel)}`} aberto={pagando} fechar={() => setPagando(false)} rodape={<button className="botao" onClick={pagar}>Registrar pagamento</button>}>
        <Campo rotulo="Conta"><Selecao {...fp.campo('conta_id')} itens={ativas} /></Campo>
        <Campo rotulo="Data"><Data {...fp.campo('data')} /></Campo>
        <Campo rotulo="Valor" erro={fp.erros.valor}><Moeda {...fp.campo('valor')} /></Campo>
        <p className="sutil" style={{ gridColumn: '1 / -1', margin: 0 }}>O pagamento sai do saldo da conta, mas não conta de novo nas despesas do mês: as compras do cartão já foram contadas quando aconteceram.</p>
      </Modal>
      <Modal titulo={`Valor da fatura · ${rotuloCompetencia(sel)}`} aberto={informando} fechar={() => setInformando(false)} largura={480}
        rodape={<>{informada && <button className="botao secundario" onClick={() => informar(true)}>Remover valor</button>}<button className="botao" onClick={() => informar()}>Salvar</button></>}>
        <Campo rotulo="Total da fatura (como no app do banco)" erro={fi.erros.valor} largo><Moeda {...fi.campo('valor')} /></Campo>
        <Campo rotulo="Observação" largo><Texto placeholder="Parcelas, IOF, ajuste…" {...fi.campo('observacao')} /></Campo>
        <p className="sutil" style={{ gridColumn: '1 / -1', margin: 0 }}>Quando existe, este valor é o total da fatura. Sem ele, o total é a soma das compras lançadas no Pobi.</p>
      </Modal>
    </div>
  )
}
