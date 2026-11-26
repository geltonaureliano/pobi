import { describe, expect, it } from 'vitest'
import { gerarParcelas, parcelasAtrasadas, progressoDaDivida, saldoDevedor } from './rules'

describe('dívidas', () => {
  it('sobra de centavos vai para a última parcela e o total bate', () => {
    const ps = gerarParcelas(10000, 3, '2026-01-31')
    expect(ps.map((p) => p.valor)).toEqual([3333, 3333, 3334])
    expect(ps.map((p) => p.vencimento)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31'])
  })
  it('saldo, atraso e progresso', () => {
    const ps = gerarParcelas(3000, 3, '2026-09-10').map((p, i) => ({ ...p, id: i, divida_id: 1, pago_em: i === 0 ? '2026-09-10' : null, valor_pago: null }))
    expect(saldoDevedor(ps)).toBe(2000)
    expect(parcelasAtrasadas(ps, '2026-11-01').map((p) => p.numero)).toEqual([2])
    expect(progressoDaDivida(ps)).toBeCloseTo(1 / 3)
  })
})
