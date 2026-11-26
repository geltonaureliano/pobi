import { formatarBRL } from '../../shared/dinheiro'
import { rotuloMes } from '../../shared/data'
import type { CelulaHeatmap } from '../../domain/painel/rules'

export function Heatmap({ colunas }: { colunas: CelulaHeatmap[][] }) {
  const meses: string[] = []
  colunas.forEach((col) => {
    const primeiro = col.find(Boolean)
    if (primeiro && Number(primeiro.data.slice(8)) <= 7) meses.push(rotuloMes(primeiro.data.slice(0, 7)))
  })
  return (
    <>
      <div className="heatmap">
        {colunas.map((col, i) => (
          <div className="heatmap-col" key={i}>
            {Array.from({ length: 7 }, (_, d) => {
              const c = col[d]
              return c ? (
                <div key={d} className={`cel n${c.nivel}`} title={`${c.data.split('-').reverse().join('/')}: ${formatarBRL(c.valor)}`} />
              ) : (
                <div key={d} className="cel" style={{ visibility: 'hidden' }} />
              )
            })}
          </div>
        ))}
      </div>
      <div className="meses">{meses.map((m, i) => <span key={i}>{m}</span>)}</div>
    </>
  )
}
