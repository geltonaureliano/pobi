import { describe, expect, it } from 'vitest'
import { faturaDaCompra, vencimentoDaFatura } from './rules'

describe('fatura da compra', () => {
  const fecha3vence10 = { dia_fechamento: 3, dia_vencimento: 10 }
  const fecha28vence5 = { dia_fechamento: 28, dia_vencimento: 5 }
  it('compra até o fechamento fica no mês; depois vai para o próximo', () => {
    expect(faturaDaCompra(fecha3vence10, '2026-11-03')).toBe('2026-11')
    expect(faturaDaCompra(fecha3vence10, '2026-11-04')).toBe('2026-12')
  })
  it('vencimento antes do fechamento joga a fatura para o mês seguinte', () => {
    expect(faturaDaCompra(fecha28vence5, '2026-11-20')).toBe('2026-12')
    expect(faturaDaCompra(fecha28vence5, '2026-11-29')).toBe('2027-01')
  })
  it('fechamento 31 em fevereiro vira o último dia', () => {
    expect(faturaDaCompra({ dia_fechamento: 31, dia_vencimento: 10 }, '2026-02-28')).toBe('2026-03')
    expect(vencimentoDaFatura({ dia_vencimento: 31 }, '2026-02')).toBe('2026-02-28')
  })
})
