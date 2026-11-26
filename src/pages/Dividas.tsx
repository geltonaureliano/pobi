import { useState } from 'react'
import { formatarBRL, paraCentavos } from '../shared/dinheiro'
import { dataValida, hoje } from '../shared/data'
import { atualizarDivida, atualizarParcela, criarDivida, excluirDivida, pagarParcela } from '../domain/divida/repository'
import { parcelasAtrasadas, progressoDaDivida, saldoDevedor } from '../domain/divida/rules'
import type { Divida, Parcela, StatusDivida } from '../domain/divida/model'
import { Barra } from '../ui/components/Barra'
import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { Campo, Vazio, Texto, Data, Moeda, Selecao } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import type { Dados } from '../ui/useDados'

const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',')
const br = (d: string) => d.split('-').reverse().join('/')

export function Dividas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [editando, setEditando] = useState<Divida | 'nova' | null>(null)
  const [aberta, setAberta] = useState<number | null>(null)
  const [pagando, setPagando] = useState<{ divida: Divida; parcela: Parcela } | null>(null)
  const [ajustando, setAjustando] = useState<Parcela | null>(null)
  const fd = useForm({ nome: '', credor: '', total: '', parcelas: '1', primeiro: hoje(), taxa: '', status: 'ATIVA' as StatusDivida, categoria_id: '' })
  const fp = useForm({ conta_id: '', valor: '', data: hoje() })
  const fa = useForm({ valor: '', vencimento: '' })
  const hojeISO = hoje()
  const ativas = dados.dividas.filter((d) => d.status !== 'QUITADA')
  const todasParcelas = dados.parcelas.filter((p) => ativas.some((d) => d.id === p.divida_id))
  const em30 = new Date(); em30.setDate(em30.getDate() + 30)
  const prox30 = todasParcelas.filter((p) => !p.pago_em && p.vencimento <= em30.toISOString().slice(0, 10)).reduce((s, p) => s + p.valor, 0)
  const catDividas = dados.categorias.find((k) => k.nome === 'Dívidas')?.id

  function abrir(d?: Divida) {
    fd.reiniciar(d
      ? { nome: d.nome, credor: d.credor ?? '', total: reais(d.valor_total), parcelas: '', primeiro: '', taxa: d.taxa_mensal != null ? String(d.taxa_mensal).replace('.', ',') : '', status: d.status, categoria_id: d.categoria_id ? String(d.categoria_id) : '' }
      : { nome: '', credor: '', total: '', parcelas: '1', primeiro: hoje(), taxa: '', status: 'ATIVA', categoria_id: catDividas ? String(catDividas) : '' })
    setEditando(d ?? 'nova')
  }
  async function salvar() {
    const v = fd.valores
    const taxa = v.taxa.trim() ? Number(v.taxa.replace(',', '.')) : null
    const erros: Record<string, string> = {}
    if (!v.nome.trim()) erros.nome = 'Informe o nome.'
    if (taxa != null && !(taxa >= 0)) erros.taxa = 'Taxa inválida.'
    if (editando === 'nova') {
      const t = paraCentavos(v.total), n = Number(v.parcelas)
      if (t == null || t <= 0) erros.total = 'Valor maior que zero.'
      if (!(Number.isInteger(n) && n >= 1 && n <= 600)) erros.parcelas = 'De 1 a 600.'
      if (!dataValida(v.primeiro)) erros.primeiro = 'Data inválida.'
      if (Object.keys(erros).length) return fd.setErros(erros)
      await criarDivida({ nome: v.nome.trim(), credor: v.credor.trim() || null, total: t!, parcelas: n, primeiroVencimento: v.primeiro, taxa_mensal: taxa, categoria_id: v.categoria_id ? Number(v.categoria_id) : null })
    } else if (editando) {
      if (Object.keys(erros).length) return fd.setErros(erros)
      await atualizarDivida(editando.id, { nome: v.nome.trim(), credor: v.credor.trim() || null, taxa_mensal: taxa, status: v.status })
    }
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

  return (
    <>
      <div className="topo"><h1>Dívidas</h1><button className="botao" onClick={() => abrir()}>Nova dívida</button></div>
      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card"><h3>Saldo devedor</h3><div className="valor">{formatarBRL(saldoDevedor(todasParcelas))}</div></div>
        <div className="card"><h3>Próximos 30 dias</h3><div className="valor">{formatarBRL(prox30)}</div></div>
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
              <h3>{d.nome}{d.credor && <span className="sutil"> · {d.credor}</span>}{d.taxa_mensal != null && <span className="sutil"> · {String(d.taxa_mensal).replace('.', ',')}% a.m.</span>}</h3>
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
                <span className="acoes"><strong>{formatarBRL(prox.valor)}</strong><button className="aba ativa" onClick={() => abrirPagamento(d, prox)}>pagar</button></span>
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
                      <td className="num">{formatarBRL(p.valor_pago ?? p.valor)}</td>
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

      <Modal titulo={editando === 'nova' ? 'Nova dívida' : 'Editar dívida'} aberto={editando != null} fechar={() => setEditando(null)} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
        <Campo rotulo="Nome" erro={fd.erros.nome}><Texto autoFocus placeholder="Financiamento, empréstimo…" {...fd.campo('nome')} /></Campo>
        <Campo rotulo="Credor"><Texto {...fd.campo('credor')} /></Campo>
        {editando === 'nova' ? <>
          <Campo rotulo="Valor total" erro={fd.erros.total}><Moeda {...fd.campo('total')} /></Campo>
          <Campo rotulo="Número de parcelas" erro={fd.erros.parcelas}><Texto numerico maxLength={3} {...fd.campo('parcelas')} /></Campo>
          <Campo rotulo="1º vencimento" erro={fd.erros.primeiro}><Data {...fd.campo('primeiro')} /></Campo>
        </> : (
          <Campo rotulo="Situação"><Selecao {...fd.campo('status')} vazio={null} itens={[{ id: 'ATIVA', nome: 'Ativa' }, { id: 'RENEGOCIADA', nome: 'Renegociada' }, { id: 'QUITADA', nome: 'Quitada' }]} /></Campo>
        )}
        <Campo rotulo="Juros ao mês (%, informativo)" erro={fd.erros.taxa}><Texto placeholder="opcional" inputMode="decimal" sufixo="% a.m." {...fd.campo('taxa')} /></Campo>
        {editando === 'nova' && <Campo rotulo="Categoria"><Selecao {...fd.campo('categoria_id')} itens={dados.categorias.filter((k) => k.tipo === 'DESPESA')} /></Campo>}
        <p className="sutil" style={{ gridColumn: '1 / -1', margin: 0 }}>{editando === 'nova' ? 'O total é dividido em parcelas mensais iguais; os centavos que sobram vão para a última. Dá para ajustar parcela por parcela depois.' : 'As parcelas já geradas não mudam aqui; ajuste cada uma na lista de parcelas.'}</p>
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
