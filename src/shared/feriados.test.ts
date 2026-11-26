import { describe, expect, it } from 'vitest'
import { diasUteis, feriadosNacionais } from './feriados'

describe('feriados e dias úteis', () => {
  it('Sexta-feira Santa móvel', () => {
    expect(feriadosNacionais(2027).find((f) => f.nome === 'Sexta-feira Santa')?.data).toBe('2027-03-26')
    expect(feriadosNacionais(2026).find((f) => f.nome === 'Sexta-feira Santa')?.data).toBe('2026-04-03')
  })
  // Valores conferem com o cálculo que você já usava nas receitas por hora (2027).
  it.each([
    ['2027-01', 20], ['2027-02', 20], ['2027-03', 22], ['2027-04', 21], ['2027-05', 21], ['2027-06', 22],
    ['2027-07', 22], ['2027-08', 22], ['2027-09', 21], ['2027-10', 20], ['2027-11', 20], ['2027-12', 23],
  ])('%s tem %i dias úteis', (c, n) => {
    expect(diasUteis(c).dias).toBe(n)
  })
  it('outubro/2026 tem 21 dias úteis (NF de 168 horas)', () => {
    expect(diasUteis('2026-10').dias).toBe(21)
  })
})
