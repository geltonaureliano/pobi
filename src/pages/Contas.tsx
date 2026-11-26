import { useState } from 'react'
import { formatarBRL } from '../shared/dinheiro'
import { validarConta } from '../domain/conta/form'
import { arquivarConta, atualizarConta, criarConta, definirPrincipal, excluirConta } from '../domain/conta/repository'
import type { ContaComSaldo, TipoConta } from '../domain/conta/model'
import { saldoTotal } from '../domain/conta/rules'
import { Modal, BotaoExcluir } from '../ui/components/Modal'
import { Campo, Vazio, Texto, Moeda, Selecao } from '../ui/components/Campos'
import { useForm } from '../ui/useForm'
import type { Dados } from '../ui/useDados'

const TIPOS: { id: TipoConta; nome: string }[] = [
  { id: 'CORRENTE', nome: 'Corrente' }, { id: 'POUPANCA', nome: 'Poupança' }, { id: 'INVESTIMENTO', nome: 'Investimento' }, { id: 'CARTEIRA', nome: 'Carteira' },
]
const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',')

export function Contas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [contaEd, setContaEd] = useState<number | 'nova' | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const fc = useForm({ nome: '', tipo: 'CORRENTE' as TipoConta, saldo_inicial: '' })
  const ativas = dados.contas.filter((x) => !x.arquivada)
  const arquivadas = dados.contas.filter((x) => x.arquivada)

  function abrirConta(c?: ContaComSaldo) {
    fc.reiniciar(c ? { nome: c.nome, tipo: c.tipo, saldo_inicial: reais(c.saldo_inicial) } : { nome: '', tipo: 'CORRENTE', saldo_inicial: '' })
    setContaEd(c ? c.id : 'nova')
  }
  async function salvarConta() {
    const r = validarConta(fc.valores)
    if (!r.ok) return fc.setErros(r.erros)
    if (contaEd === 'nova') await criarConta(r.valor)
    else if (contaEd != null) await atualizarConta(contaEd, r.valor)
    setContaEd(null); recarregar()
  }
  return (
    <>
      <div className="topo"><h1>Contas</h1><span className="sutil">patrimônio em contas {formatarBRL(saldoTotal(dados.contas))}</span></div>
      {aviso && <div className="secao"><div className="aviso">{aviso}</div></div>}
      <div className="secao">
        <div className="secao-topo"><h3>Contas</h3><button className="botao" onClick={() => abrirConta()}>Nova conta</button></div>
        {ativas.length ? (
          <div className="grade-cards">
            {ativas.map((c) => (
              <div className="mini-card" key={c.id}>
                <div className="linha-topo"><strong>{c.nome}</strong>{c.principal ? <span className="tag laranja">principal</span> : <span className="tag">{TIPOS.find((t) => t.id === c.tipo)?.nome}</span>}</div>
                <div className="valor-m">{formatarBRL(c.saldo)}</div>
                <div className="acoes" style={{ justifyContent: 'flex-start' }}>
                  <button className="aba" onClick={() => abrirConta(c)}>editar</button>
                  {!c.principal && <button className="aba" onClick={async () => { await definirPrincipal(c.id); recarregar() }}>principal</button>}
                  <BotaoExcluir onConfirmar={async () => {
                    const r = await excluirConta(c.id)
                    if (r === 'tem-lancamentos') { await arquivarConta(c.id, true); setAviso(`${c.nome} tem lançamentos, então foi arquivada em vez de excluída.`) }
                    recarregar()
                  }} />
                </div>
              </div>
            ))}
          </div>
        ) : <Vazio>Cadastre sua primeira conta para começar.</Vazio>}
        {arquivadas.length > 0 && (
          <p className="sutil" style={{ marginTop: 14 }}>
            Arquivadas: {arquivadas.map((c) => <button key={c.id} className="aba" style={{ marginLeft: 6 }} onClick={async () => { await arquivarConta(c.id, false); recarregar() }}>{c.nome} · reativar</button>)}
          </p>
        )}
      </div>

      <Modal titulo={contaEd === 'nova' ? 'Nova conta' : 'Editar conta'} aberto={contaEd != null} fechar={() => setContaEd(null)} rodape={<button className="botao" onClick={salvarConta}>Salvar</button>}>
        <Campo rotulo="Nome" erro={fc.erros.nome} largo><Texto autoFocus {...fc.campo('nome')} /></Campo>
        <Campo rotulo="Tipo"><Selecao {...fc.campo('tipo')} itens={TIPOS} vazio={null} /></Campo>
        <Campo rotulo="Saldo inicial" erro={fc.erros.saldo_inicial}><Moeda {...fc.campo('saldo_inicial')} negativo /></Campo>
        <p className="sutil" style={{ gridColumn: '1 / -1', margin: 0 }}>Saldo inicial é o valor na conta antes do primeiro lançamento registrado aqui. Poupança e investimento contam como reserva de emergência no relatório.</p>
      </Modal>

    </>
  )
}
