import { useState } from 'react'
import { formatarBRL } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../shared/data'
import { criarCartao } from '../domain/cartao/repository'
import { cartaoVazio, validarCartao, type CamposCartao } from '../domain/cartao/form'
import type { ConversaIA } from '../domain/assistente/model'
import { buscarConversa, buscarConversaDoItem } from '../domain/assistente/repository'
import { EscolhaCadastro } from '../ui/components/EscolhaCadastro'
import { Assistente } from './assistente/Assistente'
import { BotaoConversas, HistoricoConversas } from './assistente/Historico'
import { CamposCartaoForm } from './assistente/formularios'
import { emAbertoNoCartao, faturaDaCompra, faturasDoPeriodo, marcaDePagamento, type ResumoFatura } from '../domain/cartao/rules'
import type { Cartao } from '../domain/cartao/model'
import { criarLancamento } from '../domain/lancamento/repository'
import { Modal, IconeEditar } from '../ui/components/Modal'
import { Campo, Vazio, Data, Moeda, Selecao } from '../ui/components/Campos'
import { Barra } from '../ui/components/Barra'
import { useForm } from '../ui/useForm'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'
import { toast } from '../ui/toast'

const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',')

export function Cartoes({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [novo, setNovo] = useState(false)
  const [escolhendo, setEscolhendo] = useState(false)
  const [historico, setHistorico] = useState(false)
  const [assistente, setAssistente] = useState<{ conversa: ConversaIA | null; editar: Cartao | null } | null>(null)
  const [pagando, setPagando] = useState<{ cartao: Cartao; fatura: ResumoFatura } | null>(null)
  const principal = String(dados.contas.find((x) => x.principal)?.id ?? '')
  const fk = useForm<CamposCartao>(cartaoVazio(principal))
  const fp = useForm({ conta_id: '', valor: '', data: hoje() })
  const ativas = dados.contas.filter((x) => !x.arquivada)
  const cartoes = dados.cartoes.filter((x) => !x.arquivado)
  const atual = competenciaDe(hoje())
  const limiteTotal = cartoes.reduce((s, k) => s + k.limite, 0)
  const usadoTotal = cartoes.reduce((s, k) => s + emAbertoNoCartao(k, dados.lancamentos), 0)

  async function salvarNovo() {
    const r = validarCartao(fk.valores)
    if (!r.ok) return fk.setErros(r.erros)
    await criarCartao(r.valor)
    toast.sucesso('Cartão adicionado', r.valor.nome)
    setNovo(false); recarregar()
  }
  /** Editar abre a página do assistente, com o chat ligado a esse cartão. */
  async function editarComChat(k: Cartao) {
    setAssistente({ conversa: await buscarConversaDoItem('cartao', k.id).catch(() => null), editar: k })
  }
  function abrirPagamento(cartao: Cartao, fatura: ResumoFatura) {
    fp.reiniciar({ conta_id: String(cartao.conta_pagamento_id ?? ativas[0]?.id ?? ''), valor: reais(fatura.emAberto), data: hoje() })
    setPagando({ cartao, fatura })
  }
  async function pagar() {
    if (!pagando) return
    const valor = Math.round(Number(fp.valores.valor.replace(/\./g, '').replace(',', '.')) * 100)
    if (!fp.valores.conta_id || !(valor > 0)) return fp.setErros({ valor: 'Informe conta e valor.' })
    await criarLancamento({
      descricao: `Fatura ${pagando.cartao.nome} ${rotuloCompetencia(pagando.fatura.fatura)}`, valor, tipo: 'DESPESA', status: 'PAGO',
      data: fp.valores.data, conta_id: Number(fp.valores.conta_id), conta_destino_id: null, cartao_id: null, categoria_id: null,
      observacao: null, fatura_ref: marcaDePagamento(pagando.cartao.id, pagando.fatura.fatura),
    })
    toast.sucesso('Fatura paga', `${pagando.cartao.nome} · ${rotuloCompetencia(pagando.fatura.fatura)}`)
    setPagando(null); recarregar()
  }

  if (assistente) {
    const { conversa: conv, editar } = assistente
    return <Assistente key={`${editar?.id ?? ''}-${conv?.id ?? 'nova'}`} alvo="cartao" dados={dados} conversa={conv} editar={editar}
      trocar={(x) => setAssistente({ conversa: x, editar: null })}
      voltar={() => setAssistente(null)} concluir={(msg) => { setAssistente(null); toast.sucesso(msg); recarregar() }} />
  }
  const arquivados = dados.cartoes.filter((x) => x.arquivado)

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
        <div className="secao-topo"><h3>Seus cartões</h3></div>
        {!cartoes.length && <Vazio>Nenhum cartão cadastrado.</Vazio>}
        {cartoes.map((k) => {
          const atualFat = faturaDaCompra(k, hoje())
          const faturas = faturasDoPeriodo(k, dados.lancamentos, deslocarCompetencia(atual, -5), deslocarCompetencia(atualFat, 0)).filter((f) => f.situacao !== 'vazia')
          const aberto = emAbertoNoCartao(k, dados.lancamentos)
          return (
            <div key={k.id} style={{ marginBottom: 22 }}>
              <div className="secao-topo" style={{ marginBottom: 10 }}>
                <div className="cartao-titulo">
                  <span className={`cartao-chip ${(k.bandeira ?? '').toLowerCase().replace(/\s+/g, '-')}`} aria-hidden="true" />
                  <div>
                    <div className="receita-nome"><strong>{k.nome}</strong>{k.origem === 'IA' && <span className="tag ia">IA</span>}</div>
                    <div className="divida-meta">
                      {k.emissor && <span>{k.emissor}</span>}
                      {k.bandeira && <span>{k.bandeira}</span>}
                      {k.final && <span>•••• {k.final}</span>}
                      <span>fecha dia {k.dia_fechamento}</span>
                      <span>vence dia {k.dia_vencimento}</span>
                      {k.anuidade ? <span>anuidade <Dinheiro valor={k.anuidade} />/mês</span> : null}
                    </div>
                  </div>
                </div>
                <div className="acoes"><button className="botao-icone" onClick={() => editarComChat(k)} aria-label={`Editar ${k.nome}`} title="Editar (abre o assistente)"><IconeEditar /></button></div>
              </div>
              <Barra rotulo={`Limite usado ${formatarBRL(aberto)} de ${formatarBRL(k.limite)}`} direita={`disponível ${formatarBRL(k.limite - aberto)}`} fracao={k.limite ? aberto / k.limite : 0} estourada={aberto > k.limite} />
              <table className="tabela">
                <thead><tr><th>Fatura</th><th>Vencimento</th><th>Situação</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Em aberto</th><th /></tr></thead>
                <tbody>
                  {faturas.map((f) => (
                    <tr key={f.fatura} className={f.fatura === atualFat ? 'destaque' : ''}>
                      <td>{rotuloCompetencia(f.fatura)}{f.fatura === atualFat && <span className="sutil"> · atual</span>}</td>
                      <td>{f.vencimento.split('-').reverse().join('/')}</td>
                      <td><span className={`tag ${f.situacao === 'paga' ? 'bom' : f.vencimento < hoje() ? 'ruim' : 'laranja'}`}>{f.situacao === 'paga' ? 'paga' : f.vencimento < hoje() ? 'vencida' : f.situacao}</span></td>
                      <td className="num"><Dinheiro valor={f.total} /></td>
                      <td className="num"><Dinheiro valor={f.emAberto} /></td>
                      <td><div className="acoes">{f.emAberto > 0 && <button className="aba ativa" onClick={() => abrirPagamento(k, f)}>pagar fatura</button>}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!faturas.length && <p className="sutil">Sem compras nos últimos meses.</p>}
            </div>
          )
        })}
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

      <Modal titulo={'Novo cartão'} aberto={novo} fechar={() => setNovo(false)} largura={640} rodape={<button className="botao" onClick={salvarNovo}>Salvar</button>}>
        <CamposCartaoForm f={fk} foco contas={ativas} />
      </Modal>

      <Modal titulo={pagando ? `Pagar fatura ${pagando.cartao.nome} · ${rotuloCompetencia(pagando.fatura.fatura)}` : ''} aberto={pagando != null} fechar={() => setPagando(null)} rodape={<button className="botao" onClick={pagar}>Registrar pagamento</button>}>
        <Campo rotulo="Conta"><Selecao {...fp.campo('conta_id')} itens={ativas} /></Campo>
        <Campo rotulo="Data"><Data {...fp.campo('data')} /></Campo>
        <Campo rotulo="Valor" erro={fp.erros.valor}><Moeda {...fp.campo('valor')} /></Campo>
        <p className="sutil" style={{ gridColumn: '1 / -1', margin: 0 }}>O pagamento sai do saldo da conta, mas não conta de novo nas despesas do mês: as compras do cartão já foram contadas quando aconteceram.</p>
      </Modal>
    </>
  )
}
