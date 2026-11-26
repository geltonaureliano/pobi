import { useState } from 'react'
import { formatarBRL, paraCentavos, pctParaTexto } from '../shared/dinheiro'
import { dataValida, hoje } from '../shared/data'
import { atualizarDivida, atualizarParcela, criarDivida, excluirDivida, pagarParcela } from '../domain/divida/repository'
import { parcelasAtrasadas, progressoDaDivida, saldoDevedor } from '../domain/divida/rules'
import { SISTEMAS, TIPOS_DIVIDA, type Divida, type Parcela } from '../domain/divida/model'
import { camposDeDivida, camposDividaVazios, validarDivida, type CamposDivida } from '../domain/divida/form'
import { EscolhaCadastro } from '../ui/components/EscolhaCadastro'
import { Assistente } from './assistente/Assistente'
import { CamposDividaForm } from './assistente/formularios'
import { Barra } from '../ui/components/Barra'
import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { Campo, Vazio, Data, Moeda, Selecao } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',')
const br = (d: string) => d.split('-').reverse().join('/')

export function Dividas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [editando, setEditando] = useState<Divida | 'nova' | null>(null)
  const [aberta, setAberta] = useState<number | null>(null)
  const [pagando, setPagando] = useState<{ divida: Divida; parcela: Parcela } | null>(null)
  const [ajustando, setAjustando] = useState<Parcela | null>(null)
  const fd = useForm<CamposDivida>(camposDividaVazios())
  const [escolhendo, setEscolhendo] = useState(false)
  const [comIA, setComIA] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const fp = useForm({ conta_id: '', valor: '', data: hoje() })
  const fa = useForm({ valor: '', vencimento: '' })
  const hojeISO = hoje()
  const ativas = dados.dividas.filter((d) => d.status !== 'QUITADA')
  const todasParcelas = dados.parcelas.filter((p) => ativas.some((d) => d.id === p.divida_id))
  const em30 = new Date(); em30.setDate(em30.getDate() + 30)
  const prox30 = todasParcelas.filter((p) => !p.pago_em && p.vencimento <= em30.toISOString().slice(0, 10)).reduce((s, p) => s + p.valor, 0)
  const catDividas = dados.categorias.find((k) => k.nome === 'Dívidas')?.id

  function abrir(d?: Divida) {
    fd.reiniciar(d ? camposDeDivida(d) : camposDividaVazios(catDividas ? String(catDividas) : ''))
    setEditando(d ?? 'nova')
  }
  async function salvar() {
    const r = validarDivida(fd.valores, editando === 'nova')
    if (!r.ok) return fd.setErros(r.erros)
    if (editando === 'nova') await criarDivida(r.nova)
    else if (editando) await atualizarDivida(editando.id, r.edicao)
    setEditando(null); recarregar()
  }
  function abrirPagamento(divida: Divida, parcela: Parcela) {
    fp.reiniciar({ conta_id: String(dados.contas.find((x) => x.principal)?.id ?? ''), valor: reais(parcela.valor), data: hoje() })
    setPagando({ divida, parcela })
  }
  async function pagar() {
    if (!pagando) return
    const v = paraCentavos(fp.valores.valor)
    if (v == null || v <= 0 || !dataValida(fp.valores.data)) return fp.setErros({ valor: 'Valor e data válidos.' })
    await pagarParcela({ ...pagando, data: fp.valores.data, valor: v, conta_id: fp.valores.conta_id ? Number(fp.valores.conta_id) : null, categoria_id: catDividas ?? null })
    setPagando(null); recarregar()
  }

  if (comIA) {
    return <Assistente alvo="divida" dados={dados} voltar={() => setComIA(false)} concluir={(msg) => { setComIA(false); setAviso(msg); recarregar() }} />
  }

  return (
    <>
      <div className="topo"><h1>Dívidas</h1><button className="botao" onClick={() => setEscolhendo(true)}>Nova dívida</button></div>
      {aviso && <div className="secao"><div className="aviso sucesso">{aviso}</div></div>}
      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card"><h3>Saldo devedor</h3><div className="valor"><Dinheiro valor={saldoDevedor(todasParcelas)} animar /></div></div>
        <div className="card"><h3>Próximos 30 dias</h3><div className="valor"><Dinheiro valor={prox30} animar /></div></div>
        <div className="card"><h3>Parcelas atrasadas</h3><div className={`valor ${parcelasAtrasadas(todasParcelas, hojeISO).length ? '' : 'pos'}`}>{parcelasAtrasadas(todasParcelas, hojeISO).length}</div></div>
      </div>
      {!dados.dividas.length && <div className="secao"><Vazio>Nenhuma dívida cadastrada. Que bom!</Vazio></div>}
      {dados.dividas.map((d) => {
        const ps = dados.parcelas.filter((p) => p.divida_id === d.id)
        const prox = ps.find((p) => !p.pago_em)
        const atrasadas = parcelasAtrasadas(ps, hojeISO).length
        return (
          <div className="secao" key={d.id} style={{ opacity: d.status === 'QUITADA' ? 0.65 : 1 }}>
            <div className="secao-topo">
              <div className="divida-titulo">
                <h3>{d.nome}{d.origem === 'IA' && <span className="tag ia" title="Cadastrada com o assistente de IA">IA</span>}</h3>
                <div className="divida-meta">
                  {d.tipo && <span>{TIPOS_DIVIDA.find((t) => t.id === d.tipo)?.nome}</span>}
                  {d.credor && <span>{d.credor}</span>}
                  {d.valor_contratado != null && <span>contratado <Dinheiro valor={d.valor_contratado} /></span>}
                  {d.taxa_mensal != null && <span>{pctParaTexto(d.taxa_mensal)}% a.m.</span>}
                  {d.taxa_anual != null && <span>{pctParaTexto(d.taxa_anual)}% a.a.</span>}
                  {d.cet_anual != null && <span>CET {pctParaTexto(d.cet_anual)}% a.a.</span>}
                  {d.sistema && <span>{SISTEMAS.find((x) => x.id === d.sistema)?.nome}</span>}
                </div>
              </div>
              <div className="acoes">
                <span className={`tag ${d.status === 'QUITADA' ? 'bom' : atrasadas ? 'ruim' : ''}`}>{d.status === 'QUITADA' ? 'quitada' : d.status === 'RENEGOCIADA' ? 'renegociada' : atrasadas ? `${atrasadas} atrasada(s)` : 'em dia'}</span>
                <button className="aba" onClick={() => setAberta(aberta === d.id ? null : d.id)}>{aberta === d.id ? 'ocultar parcelas' : 'parcelas'}</button>
                <button className="aba" onClick={() => abrir(d)}>editar</button>
                <BotaoExcluir onConfirmar={async () => { await excluirDivida(d.id); recarregar() }} />
              </div>
            </div>
            <Barra rotulo={`${formatarBRL(saldoDevedor(ps))} em aberto de ${formatarBRL(d.valor_total)}`} direita={`${ps.filter((p) => p.pago_em).length}/${ps.length} pagas`} fracao={progressoDaDivida(ps)} />
            {prox && aberta !== d.id && (
              <div className="item-lista">
                <span>Próxima: parcela {prox.numero} · vence {br(prox.vencimento)} {prox.vencimento < hojeISO && <span className="tag ruim">atrasada</span>}</span>
                <span className="acoes"><strong><Dinheiro valor={prox.valor} /></strong><button className="aba ativa" onClick={() => abrirPagamento(d, prox)}>pagar</button></span>
              </div>
            )}
            {aberta === d.id && (
              <table className="tabela">
                <thead><tr><th>#</th><th>Vencimento</th><th>Situação</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
                <tbody>
                  {ps.map((p) => (
                    <tr key={p.id}>
                      <td>{p.numero}</td>
                      <td>{br(p.vencimento)}</td>
                      <td>{p.pago_em ? <span className="tag bom">paga em {br(p.pago_em)}</span> : p.vencimento < hojeISO ? <span className="tag ruim">atrasada</span> : <span className="tag">em aberto</span>}</td>
                      <td className="num"><Dinheiro valor={p.valor_pago ?? p.valor} /></td>
                      <td><div className="acoes">{!p.pago_em && <>
                        <button className="aba" onClick={() => { fa.reiniciar({ valor: reais(p.valor), vencimento: p.vencimento }); setAjustando(p) }}>ajustar</button>
                        <button className="aba ativa" onClick={() => abrirPagamento(d, p)}>pagar</button>
                      </>}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      })}

      <EscolhaCadastro aberto={escolhendo} fechar={() => setEscolhendo(false)} titulo="Nova dívida" item="da dívida"
        manual={() => { setEscolhendo(false); abrir() }} ia={() => { setEscolhendo(false); setComIA(true) }} />

      <Modal titulo={editando === 'nova' ? 'Nova dívida' : 'Editar dívida'} aberto={editando != null} fechar={() => setEditando(null)} largura={680} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
        <CamposDividaForm f={fd} nova={editando === 'nova'} categorias={dados.categorias} />
        {editando !== 'nova' && <p className="sutil" style={{ gridColumn: '1 / -1', margin: 0 }}>As parcelas já geradas não mudam aqui; ajuste cada uma na lista de parcelas.</p>}
      </Modal>

      <Modal titulo={pagando ? `Pagar ${pagando.divida.nome} · parcela ${pagando.parcela.numero}` : ''} aberto={pagando != null} fechar={() => setPagando(null)} rodape={<button className="botao" onClick={pagar}>Registrar pagamento</button>}>
        <Campo rotulo="Valor pago" erro={fp.erros.valor}><Moeda {...fp.campo('valor')} /></Campo>
        <Campo rotulo="Data"><Data {...fp.campo('data')} /></Campo>
        <Campo rotulo="Saiu da conta" largo><Selecao {...fp.campo('conta_id')} itens={dados.contas.filter((x) => !x.arquivada)} vazio="Não lançar na conta" /></Campo>
      </Modal>

      <Modal titulo={ajustando ? `Ajustar parcela ${ajustando.numero}` : ''} aberto={ajustando != null} fechar={() => setAjustando(null)} largura={480} rodape={<button className="botao" onClick={async () => {
        const v = paraCentavos(fa.valores.valor)
        if (!ajustando || v == null || v <= 0 || !dataValida(fa.valores.vencimento)) return fa.setErros({ valor: 'Valor e data válidos.' })
        await atualizarParcela(ajustando.id, v, fa.valores.vencimento); setAjustando(null); recarregar()
      }}>Salvar</button>}>
        <Campo rotulo="Valor" erro={fa.erros.valor}><Moeda {...fa.campo('valor')} /></Campo>
        <Campo rotulo="Vencimento"><Data {...fa.campo('vencimento')} /></Campo>
      </Modal>
    </>
  )
}
