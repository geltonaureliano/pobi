import { formatarBRL, formatarCompacto } from '../../shared/dinheiro'
import { rotuloMes } from '../../shared/data'

/** Barras agrupadas receitas × despesas por mês, em SVG puro. */
export function BarrasMensais({ meses }: { meses: { competencia: string; receitas: number; despesas: number }[] }) {
  const max = Math.max(1, ...meses.flatMap((m) => [m.receitas, m.despesas]))
  const W = 1040, H = 230, base = H - 22, larg = W / meses.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <g key={f}>
          <line x1={0} x2={W} y1={base - f * (base - 10)} y2={base - f * (base - 10)} className="grade" />
          <text x={0} y={base - f * (base - 10) - 3} className="eixo">{formatarCompacto(max * f)}</text>
        </g>
      ))}
      {meses.map((m, i) => {
        const x = i * larg + larg / 2
        const hr = (m.receitas / max) * (base - 10), hd = (m.despesas / max) * (base - 10)
        return (
          <g key={m.competencia}>
            <rect x={x - 13} y={base - hr} width={11} height={hr} rx={3} className="b-receita"><title>{`Receitas ${formatarBRL(m.receitas)}`}</title></rect>
            <rect x={x + 2} y={base - hd} width={11} height={hd} rx={3} className="b-despesa"><title>{`Despesas ${formatarBRL(m.despesas)}`}</title></rect>
            <text x={x} y={H - 6} textAnchor="middle" className="eixo">{rotuloMes(m.competencia)}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** Linha do saldo acumulado com área, zero marcado. */
export function LinhaAcumulada({ meses }: { meses: { competencia: string; acumulado: number }[] }) {
  const W = 1040, H = 180, pad = 14
  const vals = meses.map((m) => m.acumulado)
  const min = Math.min(0, ...vals), max = Math.max(1, ...vals)
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - 2 * pad - 14)
  const x = (i: number) => (i + 0.5) * (W / meses.length)
  const pts = meses.map((m, i) => `${x(i)},${y(m.acumulado)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="grade" />
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(meses.length - 1)},${y(0)}`} className="area" />
      <polyline points={pts} className="linha" />
      {meses.map((m, i) => (
        <g key={m.competencia}>
          <circle cx={x(i)} cy={y(m.acumulado)} r={3.5} className="ponto"><title>{formatarBRL(m.acumulado)}</title></circle>
          <text x={x(i)} y={H - 4} textAnchor="middle" className="eixo">{rotuloMes(m.competencia)}</text>
        </g>
      ))}
    </svg>
  )
}

export function Anel({ valor, maximo = 100, rotulo }: { valor: number; maximo?: number; rotulo: string }) {
  const r = 52, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, valor / maximo))
  return (
    <svg viewBox="0 0 140 140" width={140} height={140}>
      <circle cx={70} cy={70} r={r} className="anel-fundo" />
      <circle cx={70} cy={70} r={r} className="anel" strokeDasharray={`${c * f} ${c}`} transform="rotate(-90 70 70)" />
      <text x={70} y={72} textAnchor="middle" className="anel-valor">{Math.round(valor)}</text>
      <text x={70} y={92} textAnchor="middle" className="eixo">{rotulo}</text>
    </svg>
  )
}

/** Barra horizontal dividida em segmentos (ex.: essenciais × não essenciais). */
export function Segmentos({ partes }: { partes: { nome: string; valor: number; classe: string }[] }) {
  const total = partes.reduce((s, p) => s + p.valor, 0) || 1
  return (
    <>
      <div className="segmentos">{partes.map((p) => <i key={p.nome} className={p.classe} style={{ width: `${(p.valor / total) * 100}%` }} />)}</div>
      <div className="legenda">{partes.map((p) => <span key={p.nome}><b className={p.classe} />{p.nome} · {formatarBRL(p.valor)}</span>)}</div>
    </>
  )
}
