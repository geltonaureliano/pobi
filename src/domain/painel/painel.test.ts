import { describe, expect, it } from 'vitest'
import { l } from '../lancamento/fixtures'
import { heatmapDeGastos, metricasDoMes } from './rules'

describe('painel', () => {
  it('variação e taxa de poupança', () => {
    const ls = [
      l({ tipo: 'RECEITA', valor: 10000, data: '2026-10-05' }), l({ valor: 8000, data: '2026-10-10' }),
      l({ tipo: 'RECEITA', valor: 10000, data: '2026-11-05' }), l({ valor: 6000, data: '2026-11-10' }),
    ]
    const m = metricasDoMes(ls, '2026-11')
    expect(m.despesas.variacao).toBe(-0.25)
    expect(m.taxaPoupanca).toEqual({ valor: 0.4, anterior: 0.2 })
  })
  it('sem mês anterior não inventa variação', () => {
    expect(metricasDoMes([l({ valor: 1 })], '2026-11').despesas.variacao).toBeNull()
  })
  it('heatmap alinha pelo dia da semana e usa níveis 0..4', () => {
    // 2026-11-01 é domingo
    const cols = heatmapDeGastos([l({ valor: 100, data: '2026-11-01' }), l({ valor: 900, data: '2026-11-03' })], '2026-11-01', '2026-11-14')
    expect(cols).toHaveLength(2)
    expect(cols[0][0]).toMatchObject({ data: '2026-11-01', nivel: 1 })
    expect(cols[0][2]).toMatchObject({ data: '2026-11-03', nivel: 4 })
    expect(cols[0][1].nivel).toBe(0)
  })
})
