import { useState } from 'react'
import { formatarBRL } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../shared/data'
import { atualizarCartao, criarCartao, excluirCartao } from '../domain/cartao/repository'
import { validarCartao, type CamposCartao } from '../domain/cartao/form'
import { emAbertoNoCartao, faturaDaCompra, faturasDoPeriodo, marcaDePagamento, type ResumoFatura } from '../domain/cartao/rules'
import type { Cartao } from '../domain/cartao/model'
import { criarLancamento } from '../domain/lancamento/repository'
import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { Campo, Vazio, Texto, Data, Moeda, Selecao } from '../ui/components/Campos'
import { Barra } from '../ui/components/Barra'
import { useForm } from '../ui/useForm'
import { Dinheiro } from '../ui/components/Dinheiro'
import type { Dados } from '../ui/useDados'

const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',')

export function Cartoes({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [cartaoEd, setCartaoEd] = useState<number | 'novo' | null>(null)
  const [pagando, setPagando] = useState<{ cartao: Cartao; fatura: ResumoFatura } | null>(null)
  const fk = useForm<CamposCartao>({ nome: '', limite: '', dia_fechamento: '', dia_vencimento: '', conta_pagamento_id: '' })
  const fp = useForm({ conta_id: '', valor: '', data: hoje() })
  const ativas = dados.contas.filter((x) => !x.arquivada)
  const cartoes = dados.cartoes.filter((x) => !x.arquivado)
  const atual = competenciaDe(hoje())
  const limiteTotal = cartoes.reduce((s, k) => s + k.limite, 0)
  const usadoTotal = cartoes.reduce((s, k) => s + emAbertoNoCartao(k, dados.lancamentos), 0)

  function abrirCartao(k?: Cartao) {
    fk.reiniciar(k
      ? { nome: k.nome, limite: reais(k.limite), dia_fechamento: String(k.dia_fechamento), dia_vencimento: String(k.dia_vencimento), conta_pagamento_id: k.conta_pagamento_id ? String(k.conta_pagamento_id) : '' }
      : { nome: '', limite: '', dia_fechamento: '', dia_vencimento: '', conta_pagamento_id: String(ativas.find((x) => x.principal)?.id ?? '') })
    setCartaoEd(k ? k.id : 'novo')
  }
  async function salvarCartao() {
    const r = validarCartao(fk.valores)
    if (!r.ok) return fk.setErros(r.erros)
    if (cartaoEd === 'novo') await criarCartao(r.valor)
    else if (cartaoEd != null) await atualizarCartao(cartaoEd, r.valor)
    setCartaoEd(null); recarregar()
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
    setPagando(null); recarregar()
  }

  return (
    <>
      <div className="topo"><h1>Cartões</h1><span className="sutil">{cartoes.length ? `em aberto ${formatarBRL(usadoTotal)} de ${formatarBRL(limiteTotal)}` : 'nenhum cartão'}</span></div>
      <div className="secao">
        <div className="secao-topo"><h3>Seus cartões</h3><button className="botao" onClick={() => abrirCartao()}>Novo cartão</button></div>
        {!cartoes.length && <Vazio>Nenhum cartão cadastrado.</Vazio>}
        {cartoes.map((k) => {
          const atualFat = faturaDaCompra(k, hoje())
          const faturas = faturasDoPeriodo(k, dados.lancamentos, deslocarCompetencia(atual, -5), deslocarCompetencia(atualFat, 0)).filter((f) => f.situacao !== 'vazia')
          const aberto = emAbertoNoCartao(k, dados.lancamentos)
          return (
            <div key={k.id} style={{ marginBottom: 22 }}>
              <div className="secao-topo" style={{ marginBottom: 10 }}>
                <div><strong>{k.nome}</strong> <span className="sutil">· fecha dia {k.dia_fechamento} · vence dia {k.dia_vencimento}</span></div>
                <div className="acoes"><button className="aba" onClick={() => abrirCartao(k)}>editar</button><BotaoExcluir rotulo="remover" onConfirmar={async () => { await excluirCartao(k.id); recarregar() }} /></div>
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
      </div>

      <Modal titulo={cartaoEd === 'novo' ? 'Novo cartão' : 'Editar cartão'} aberto={cartaoEd != null} fechar={() => setCartaoEd(null)} rodape={<button className="botao" onClick={salvarCartao}>Salvar</button>}>
        <Campo rotulo="Nome" erro={fk.erros.nome} largo><Texto autoFocus {...fk.campo('nome')} /></Campo>
        <Campo rotulo="Limite" erro={fk.erros.limite}><Moeda {...fk.campo('limite')} /></Campo>
        <Campo rotulo="Conta que paga a fatura"><Selecao {...fk.campo('conta_pagamento_id')} itens={ativas} /></Campo>
        <Campo rotulo="Dia do fechamento" erro={fk.erros.dia_fechamento}><Texto numerico maxLength={2} {...fk.campo('dia_fechamento')} /></Campo>
        <Campo rotulo="Dia do vencimento" erro={fk.erros.dia_vencimento}><Texto numerico maxLength={2} {...fk.campo('dia_vencimento')} /></Campo>
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
