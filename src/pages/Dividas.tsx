import { useState } from 'react'
import { formatarBRL, paraCentavos } from '../shared/dinheiro'
import { dataValida, hoje } from '../shared/data'
import { criarDivida, pagarParcela } from '../domain/divida/repository'
import { parcelasAtrasadas, progressoDaDivida, saldoDevedor } from '../domain/divida/rules'
import { Barra } from '../ui/components/Barra'
import type { Dados } from '../ui/useDados'

export function Dividas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const [f, setF] = useState({ nome: '', credor: '', total: '', parcelas: '1', primeiro: hoje() })
  const [erro, setErro] = useState<string | null>(null)
  const total = saldoDevedor(dados.parcelas)

  async function salvar() {
    const t = paraCentavos(f.total), n = Number(f.parcelas)
    if (!f.nome.trim() || t == null || t <= 0 || !(n >= 1) || !dataValida(f.primeiro)) return setErro('Preencha nome, valor total, parcelas e primeiro vencimento.')
    await criarDivida({ nome: f.nome.trim(), credor: f.credor.trim() || null, total: t, parcelas: n, primeiroVencimento: f.primeiro, taxa_mensal: null })
    setF({ nome: '', credor: '', total: '', parcelas: '1', primeiro: hoje() })
    setErro(null)
    recarregar()
  }

  return (
    <>
      <div className="topo"><h1>Dívidas</h1><span className="sutil">saldo devedor {formatarBRL(total)}</span></div>
      <div className="secao">
        {erro && <div className="aviso">{erro}</div>}
        <div className="form" style={{ gridTemplateColumns: '2fr 1.5fr 1fr 0.7fr 1fr auto' }}>
          <label className="campo">Nome<input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></label>
          <label className="campo">Credor<input value={f.credor} onChange={(e) => setF({ ...f, credor: e.target.value })} /></label>
          <label className="campo">Valor total<input value={f.total} onChange={(e) => setF({ ...f, total: e.target.value })} /></label>
          <label className="campo">Parcelas<input value={f.parcelas} onChange={(e) => setF({ ...f, parcelas: e.target.value })} /></label>
          <label className="campo">1º vencimento<input type="date" value={f.primeiro} onChange={(e) => setF({ ...f, primeiro: e.target.value })} /></label>
          <button className="botao" onClick={salvar}>Adicionar</button>
        </div>
      </div>
      {dados.dividas.map((d) => {
        const ps = dados.parcelas.filter((p) => p.divida_id === d.id)
        const prox = ps.find((p) => !p.pago_em)
        const atrasadas = parcelasAtrasadas(ps, hoje()).length
        return (
          <div className="secao" key={d.id}>
            <div className="secao-topo">
              <h3>{d.nome}{d.credor && <span className="sutil"> · {d.credor}</span>}</h3>
              <span className={`badge ${d.status === 'QUITADA' ? 'bom' : atrasadas ? 'ruim' : ''}`} style={{ marginTop: 0 }}>
                {d.status === 'QUITADA' ? 'Quitada' : atrasadas ? `${atrasadas} atrasada(s)` : 'Em dia'}
              </span>
            </div>
            <Barra rotulo={`${formatarBRL(saldoDevedor(ps))} em aberto de ${formatarBRL(d.valor_total)}`} direita={`${ps.filter((p) => p.pago_em).length}/${ps.length} pagas`} fracao={progressoDaDivida(ps)} />
            {prox && (
              <div className="item-lista">
                <span>Parcela {prox.numero} · vence {prox.vencimento.split('-').reverse().join('/')}</span>
                <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <strong>{formatarBRL(prox.valor)}</strong>
                  <button className="aba ativa" onClick={async () => { await pagarParcela(prox.id, hoje(), prox.valor); recarregar() }}>marcar paga</button>
                </span>
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
