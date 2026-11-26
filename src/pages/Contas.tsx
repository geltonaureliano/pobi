import { useState } from 'react'
import { formatarBRL, paraCentavos } from '../shared/dinheiro'
import { competenciaDe, hoje, rotuloCompetencia } from '../shared/data'
import { validarConta } from '../domain/conta/form'
import { criarConta, definirPrincipal } from '../domain/conta/repository'
import type { TipoConta } from '../domain/conta/model'
import { criarCartao } from '../domain/cartao/repository'
import { faturaDaCompra, totalDaFatura, vencimentoDaFatura } from '../domain/cartao/rules'
import type { Dados } from '../ui/useDados'

export function Contas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [conta, setConta] = useState({ nome: '', tipo: 'CORRENTE' as TipoConta, saldo_inicial: '' })
  const [cartao, setCartao] = useState({ nome: '', limite: '', fechamento: '', vencimento: '' })
  const [erro, setErro] = useState<string | null>(null)

  async function salvarConta() {
    const r = validarConta(conta)
    if (!r.ok) return setErro(Object.values(r.erros)[0])
    await criarConta(r.valor)
    setConta({ nome: '', tipo: 'CORRENTE', saldo_inicial: '' })
    setErro(null)
    recarregar()
  }
  async function salvarCartao() {
    const fe = Number(cartao.fechamento), ve = Number(cartao.vencimento), lim = paraCentavos(cartao.limite)
    if (!cartao.nome.trim() || !(fe >= 1 && fe <= 31) || !(ve >= 1 && ve <= 31) || lim == null) return setErro('Preencha nome, limite e dias (1 a 31) do cartão.')
    await criarCartao({ nome: cartao.nome.trim(), limite: lim, dia_fechamento: fe, dia_vencimento: ve, conta_pagamento_id: dados.contas[0]?.id ?? null })
    setCartao({ nome: '', limite: '', fechamento: '', vencimento: '' })
    setErro(null)
    recarregar()
  }

  return (
    <>
      <div className="topo"><h1>Contas e cartões</h1></div>
      {erro && <div className="secao"><div className="aviso">{erro}</div></div>}
      <div className="dupla">
        <div className="secao">
          <div className="secao-topo"><h3>Contas</h3></div>
          {dados.contas.map((c) => (
            <div className="item-lista" key={c.id}>
              <div>{c.nome} <span className="sutil">· {c.tipo.toLowerCase()}{c.principal ? ' · principal' : ''}</span></div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <strong>{formatarBRL(c.saldo)}</strong>
                {!c.principal && <button className="aba" onClick={async () => { await definirPrincipal(c.id); recarregar() }}>tornar principal</button>}
              </div>
            </div>
          ))}
          <div className="form" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', marginTop: 16 }}>
            <label className="campo">Nome<input value={conta.nome} onChange={(e) => setConta({ ...conta, nome: e.target.value })} /></label>
            <label className="campo">Tipo
              <select value={conta.tipo} onChange={(e) => setConta({ ...conta, tipo: e.target.value as TipoConta })}>
                <option value="CORRENTE">Corrente</option><option value="POUPANCA">Poupança</option><option value="INVESTIMENTO">Investimento</option><option value="CARTEIRA">Carteira</option>
              </select>
            </label>
            <label className="campo">Saldo inicial<input value={conta.saldo_inicial} onChange={(e) => setConta({ ...conta, saldo_inicial: e.target.value })} placeholder="0,00" /></label>
            <button className="botao" onClick={salvarConta}>Adicionar</button>
          </div>
        </div>
        <div className="secao">
          <div className="secao-topo"><h3>Cartões</h3></div>
          {dados.cartoes.map((k) => {
            const fatura = faturaDaCompra(k, hoje())
            const total = totalDaFatura(k, dados.lancamentos, fatura)
            return (
              <div className="item-lista" key={k.id}>
                <div>{k.nome}<div className="sutil">fatura {rotuloCompetencia(fatura)} · vence {vencimentoDaFatura(k, fatura).split('-').reverse().join('/')}</div></div>
                <div style={{ textAlign: 'right' }}><strong>{formatarBRL(total)}</strong><div className="sutil">limite {formatarBRL(k.limite)}</div></div>
              </div>
            )
          })}
          <div className="form" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto', marginTop: 16 }}>
            <label className="campo">Nome<input value={cartao.nome} onChange={(e) => setCartao({ ...cartao, nome: e.target.value })} /></label>
            <label className="campo">Limite<input value={cartao.limite} onChange={(e) => setCartao({ ...cartao, limite: e.target.value })} /></label>
            <label className="campo">Fecha dia<input value={cartao.fechamento} onChange={(e) => setCartao({ ...cartao, fechamento: e.target.value })} /></label>
            <label className="campo">Vence dia<input value={cartao.vencimento} onChange={(e) => setCartao({ ...cartao, vencimento: e.target.value })} /></label>
            <button className="botao" onClick={salvarCartao}>Adicionar</button>
          </div>
          <p className="sutil" style={{ marginTop: 16 }}>Competência atual: {rotuloCompetencia(competenciaDe(hoje()))}</p>
        </div>
      </div>
    </>
  )
}
