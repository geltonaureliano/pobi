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

/* ------------------------------------------------------------------ */
/* Gráficos do planejamento                                            */
/* ------------------------------------------------------------------ */

export const COR_TIPO = { receita: '#1f9d55', custo: '#1c1c1c', fatura: '#ea9a19', parcela: '#c9412e', livre: '#f2c06e' } as const

/** Rosca com fatias, valor no centro e legenda ao lado. */
export function Rosca({ fatias, centro, sub }: { fatias: { nome: string; valor: number; cor: string }[]; centro: string; sub?: string }) {
  const total = fatias.reduce((s, f) => s + Math.max(0, f.valor), 0) || 1
  const r = 60, c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="rosca">
      <svg viewBox="0 0 160 160" width={160} height={160} role="img" aria-label={centro}>
        <circle cx={80} cy={80} r={r} fill="none" stroke="#efede4" strokeWidth={20} />
        {fatias.filter((f) => f.valor > 0).map((f) => {
          const parte = (f.valor / total) * c
          const el = <circle key={f.nome} cx={80} cy={80} r={r} fill="none" stroke={f.cor} strokeWidth={20} strokeDasharray={`${Math.max(0, parte - 1.5)} ${c}`} strokeDashoffset={-acc} transform="rotate(-90 80 80)" className="rosca-fatia"><title>{`${f.nome}: ${formatarBRL(f.valor)} (${Math.round((f.valor / total) * 100)}%)`}</title></circle>
          acc += parte
          return el
        })}
        <text x={80} y={78} textAnchor="middle" className="rosca-centro">{centro}</text>
        {sub && <text x={80} y={96} textAnchor="middle" className="eixo">{sub}</text>}
      </svg>
      <div className="rosca-legenda">
        {fatias.map((f) => (
          <div key={f.nome}><b style={{ background: f.cor }} /><span>{f.nome}</span><strong>{formatarBRL(f.valor)}</strong><small>{Math.round((Math.max(0, f.valor) / total) * 100)}%</small></div>
        ))}
      </div>
    </div>
  )
}

export interface MesPlano { competencia: string; entradas: number; custos: number; faturas: number; parcelas: number; livre: number; realizadoDespesas?: number }

/** Entradas (barra verde fina) × saídas empilhadas (custos, faturas, parcelas) por mês, com linha do livre. */
export function BarrasPlano({ meses, selecionado, aoEscolher }: { meses: MesPlano[]; selecionado?: string; aoEscolher?: (c: string) => void }) {
  const max = Math.max(1, ...meses.flatMap((m) => [m.entradas, m.custos + m.faturas + m.parcelas]))
  const min = Math.min(0, ...meses.map((m) => m.livre))
  const W = 1040, H = 260, topo = 12, base = H - 26
  const esc = (v: number) => ((v - min) / (max - min || 1)) * (base - topo)
  const y0 = base - esc(0)
  const larg = W / meses.length
  const ptsLivre = meses.map((m, i) => `${i * larg + larg / 2},${y0 - (m.livre >= 0 ? esc(m.livre) - esc(0) : -(esc(0) - esc(m.livre)))}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico grafico-plano">
      {[0.25, 0.5, 0.75, 1].map((f) => {
        const v = max * f
        return <g key={f}><line x1={0} x2={W} y1={base - esc(v)} y2={base - esc(v)} className="grade" /><text x={2} y={base - esc(v) - 3} className="eixo">{formatarCompacto(v)}</text></g>
      })}
      <line x1={0} x2={W} y1={y0} y2={y0} className="grade zero" />
      {meses.map((m, i) => {
        const x = i * larg + larg / 2
        const sel = m.competencia === selecionado
        let topoPilha = y0
        const pilha = (['custos', 'faturas', 'parcelas'] as const).map((k) => {
          const h = esc(m[k]) - esc(0)
          topoPilha -= h
          return <rect key={k} x={x + 1} y={topoPilha} width={16} height={Math.max(0, h)} fill={COR_TIPO[k === 'custos' ? 'custo' : k === 'faturas' ? 'fatura' : 'parcela']} rx={2}><title>{`${k === 'custos' ? 'Custos fixos' : k === 'faturas' ? 'Faturas' : 'Parcelas'} ${formatarBRL(m[k])}`}</title></rect>
        })
        const he = esc(m.entradas) - esc(0)
        return (
          <g key={m.competencia} className={`col ${sel ? 'sel' : ''}`} onClick={() => aoEscolher?.(m.competencia)} style={{ cursor: aoEscolher ? 'pointer' : undefined }}>
            <rect x={i * larg + 2} y={topo - 6} width={larg - 4} height={base - topo + 24} className="col-fundo" rx={8} />
            <rect x={x - 17} y={y0 - he} width={16} height={Math.max(0, he)} fill={COR_TIPO.receita} rx={2}><title>{`Receitas ${formatarBRL(m.entradas)}`}</title></rect>
            {pilha}
            <text x={x} y={H - 8} textAnchor="middle" className={`eixo ${sel ? 'eixo-sel' : ''}`}>{rotuloMes(m.competencia)}{m.competencia.endsWith('-01') ? ` ${m.competencia.slice(2, 4)}` : ''}</text>
          </g>
        )
      })}
      <polyline points={ptsLivre} className="linha-livre" />
      {meses.map((m, i) => (
        <circle key={m.competencia} cx={i * larg + larg / 2} cy={y0 - (m.livre >= 0 ? esc(m.livre) - esc(0) : -(esc(0) - esc(m.livre)))} r={4} className={`ponto-livre ${m.livre < 0 ? 'neg' : ''}`}><title>{`Livre ${formatarBRL(m.livre)}`}</title></circle>
      ))}
    </svg>
  )
}

/** Linha genérica (ex.: saldo projetado) com área e zero marcado. */
export function LinhaValores({ pontos, altura = 190 }: { pontos: { rotulo: string; valor: number; destaque?: boolean }[]; altura?: number }) {
  const W = 1040, H = altura, pad = 16
  const vals = pontos.map((p) => p.valor)
  const min = Math.min(0, ...vals), max = Math.max(1, ...vals)
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - 2 * pad - 16)
  const x = (i: number) => (i + 0.5) * (W / pontos.length)
  const pts = pontos.map((p, i) => `${x(i)},${y(p.valor)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      {[min, (min + max) / 2, max].map((v, i) => <g key={i}><line x1={0} x2={W} y1={y(v)} y2={y(v)} className="grade" /><text x={2} y={y(v) - 3} className="eixo">{formatarCompacto(v)}</text></g>)}
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="grade zero" />
      <polygon points={`${x(0)},${y(0)} ${pts} ${x(pontos.length - 1)},${y(0)}`} className="area" />
      <polyline points={pts} className="linha" />
      {pontos.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.valor)} r={p.destaque ? 5 : 3.5} className={`ponto ${p.valor < 0 ? 'ponto-neg' : ''}`}><title>{`${p.rotulo}: ${formatarBRL(p.valor)}`}</title></circle>
          <text x={x(i)} y={H - 4} textAnchor="middle" className="eixo">{p.rotulo}</text>
        </g>
      ))}
    </svg>
  )
}

/** Saldo dia a dia no mês (degraus) com marcas nos dias que têm movimento. */
export function FluxoDiario({ dias, hoje }: { dias: { data: string; saldo: number; eventos: { efeito: number; nome: string }[] }[]; hoje?: string }) {
  const W = 1040, H = 200, pad = 16
  const vals = dias.map((d) => d.saldo)
  const min = Math.min(0, ...vals), max = Math.max(1, ...vals)
  const y = (v: number) => pad + (1 - (v - min) / (max - min || 1)) * (H - 2 * pad - 14)
  const larg = W / dias.length
  let d = `M 0 ${y(dias[0]?.saldo ?? 0)}`
  dias.forEach((p, i) => { d += ` H ${i * larg} V ${y(p.saldo)} H ${(i + 1) * larg}` })
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="grafico">
      <line x1={0} x2={W} y1={y(0)} y2={y(0)} className="grade zero" />
      <path d={`${d} V ${y(min)} H 0 Z`} className="area-fluxo" />
      <path d={d} className="linha" fill="none" />
      {dias.map((p, i) => p.eventos.length ? (
        <g key={p.data}>
          <line x1={(i + 0.5) * larg} x2={(i + 0.5) * larg} y1={y(p.saldo)} y2={H - 16} className="marca-dia" />
          <circle cx={(i + 0.5) * larg} cy={y(p.saldo)} r={4.5} className={p.eventos.reduce((s, e) => s + e.efeito, 0) >= 0 ? 'ponto-entrada' : 'ponto-saida'}>
            <title>{`${p.data.split('-').reverse().slice(0, 2).join('/')}: ${p.eventos.map((e) => `${e.nome} ${formatarBRL(e.efeito)}`).join(' · ')} → saldo ${formatarBRL(p.saldo)}`}</title>
          </circle>
        </g>
      ) : null)}
      {hoje && dias.findIndex((p) => p.data === hoje) >= 0 && <line x1={(dias.findIndex((p) => p.data === hoje) + 0.5) * larg} x2={(dias.findIndex((p) => p.data === hoje) + 0.5) * larg} y1={pad} y2={H - 16} className="linha-hoje" />}
      {dias.map((p, i) => (i === 0 || (i + 1) % 5 === 0) ? <text key={p.data} x={(i + 0.5) * larg} y={H - 3} textAnchor="middle" className="eixo">{p.data.slice(8)}</text> : null)}
    </svg>
  )
}
