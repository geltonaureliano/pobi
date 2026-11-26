import { useEffect, useState } from 'react'
import { formatarBRL, formatarPct, paraCentavos } from '../shared/dinheiro'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../shared/data'
import { copiarOrcamentos, listarOrcamentos, salvarOrcamento } from '../domain/orcamento/repository'
import { progressoDosOrcamentos } from '../domain/orcamento/rules'
import type { Orcamento } from '../domain/orcamento/model'
import { despesaPorCategoria } from '../domain/lancamento/rules'
import { Barra } from '../ui/components/Barra'
import type { Dados } from '../ui/useDados'

export function Orcamentos({ dados }: { dados: Dados }) {
  const [c, setC] = useState(competenciaDe(hoje()))
  const [lista, setLista] = useState<(Orcamento & { categoria_nome: string })[]>([])
  const [cat, setCat] = useState('')
  const [limite, setLimite] = useState('')
  const carregar = () => listarOrcamentos(c).then(setLista)
  useEffect(() => { carregar() }, [c]) // eslint-disable-line react-hooks/exhaustive-deps
  const progresso = progressoDosOrcamentos(lista, despesaPorCategoria(dados.lancamentos, c), c)
  const totalLimite = lista.reduce((s, o) => s + o.limite, 0)
  const totalGasto = progresso.reduce((s, p) => s + p.gasto, 0)

  return (
    <>
      <div className="topo">
        <h1>Orçamentos</h1>
        <div className="abas">
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, -1))}>←</button>
          <button className="aba ativa">{rotuloCompetencia(c)}</button>
          <button className="aba" onClick={() => setC(deslocarCompetencia(c, 1))}>→</button>
        </div>
      </div>
      <div className="secao">
        <div className="secao-topo">
          <h3>{formatarBRL(totalGasto)} de {formatarBRL(totalLimite)}</h3>
          <button className="botao secundario" onClick={async () => { await copiarOrcamentos(deslocarCompetencia(c, -1), c); carregar() }}>Copiar do mês anterior</button>
        </div>
        {progresso.map((p) => (
          <Barra key={p.orcamento.id} rotulo={`${p.orcamento.categoria_nome} · ${formatarBRL(p.gasto)} de ${formatarBRL(p.orcamento.limite)}`} direita={formatarPct(p.usado)} fracao={p.usado} estourada={p.estourado} />
        ))}
        <div className="form" style={{ gridTemplateColumns: '2fr 1fr auto', marginTop: 12 }}>
          <label className="campo">Categoria
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              <option value="">—</option>
              {dados.categorias.filter((k) => k.tipo === 'DESPESA').map((k) => <option key={k.id} value={k.id}>{k.nome}</option>)}
            </select>
          </label>
          <label className="campo">Limite (R$)<input value={limite} onChange={(e) => setLimite(e.target.value)} /></label>
          <button className="botao" onClick={async () => {
            const v = paraCentavos(limite)
            if (!cat || v == null || v <= 0) return
            await salvarOrcamento(Number(cat), c, v)
            setLimite(''); carregar()
          }}>Salvar</button>
        </div>
      </div>
    </>
  )
}
