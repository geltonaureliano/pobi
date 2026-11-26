import { describe, expect, it } from 'vitest'
import { previsaoDaReceita, totalPrevisto } from './rules'

const base = { id: 1, valor: 1398490, inicio: '2026-11-01', fim: null, ativa: 1 as const, dia_recebimento: 10 }

describe('receita por hora', () => {
  const keyrus = { ...base, regra: 'HORAS' as const, valor_hora: 8800, horas_dia: 8, desconto_pct: 6.150027, defasagem_meses: 1 }
  it('nov/2026 paga outubro: 21 dias × 8h × R$ 88 menos o desconto', () => {
    const p = previsaoDaReceita(keyrus, '2026-11')!
    expect(p.horas).toMatchObject({ referencia: '2026-10', dias: 21, horas: 168, bruto: 1478400 })
    expect(p.valor).toBe(1387478) // R$ 13.874,78, o que caiu de fato
    expect(p.data).toBe('2026-11-10')
  })
  it('dez/2027 paga novembro (20 dias), jan/2028 paga dezembro (23 dias)', () => {
    expect(previsaoDaReceita({ ...keyrus, valor_hora: 9500, desconto_pct: 6.15 }, '2027-12')!.horas!.bruto).toBe(1520000)
    expect(previsaoDaReceita({ ...keyrus, valor_hora: 9500, desconto_pct: 6.15 }, '2028-01')!.valor).toBe(1640498)
  })
  it('ajuste do mês troca os dias ou fixa o valor', () => {
    expect(previsaoDaReceita(keyrus, '2026-11', { dias: 20, valor: null })!.horas!.bruto).toBe(1408000)
    expect(previsaoDaReceita(keyrus, '2026-11', { dias: null, valor: 100000 })!.valor).toBe(100000)
  })
})

describe('previsão do mês', () => {
  it('fixa, variável e fora da vigência', () => {
    const fixa = { ...base, id: 2, valor: 1203300 }
    const variavel = { ...base, id: 3, valor: 500000, regra: 'VARIAVEL' as const, valor_min: 300000, valor_max: 700000 }
    const futura = { ...base, id: 4, valor: 999, inicio: '2027-01-01' }
    expect(previsaoDaReceita(variavel, '2026-12')!.faixa).toEqual({ min: 300000, max: 700000 })
    expect(totalPrevisto([fixa, variavel, futura], '2026-12')).toBe(1703300)
    expect(totalPrevisto([fixa, variavel, futura], '2026-12', [{ receita_id: 2, competencia: '2026-12', dias: null, valor: 1000000, observacao: null }])).toBe(1500000)
  })
})

describe('receita avulsa', () => {
  const decimo = { id: 7, valor: 920100, inicio: '2026-11-30', fim: '2026-11-30', ativa: 1 as const, dia_recebimento: 30, regra: 'AVULSA' as const }
  it('cai só no mês dela, na data dela', () => {
    expect(previsaoDaReceita(decimo, '2026-11')).toMatchObject({ valor: 920100, data: '2026-11-30', regra: 'AVULSA' })
    expect(previsaoDaReceita(decimo, '2026-12')).toBeNull()
    expect(previsaoDaReceita(decimo, '2026-10')).toBeNull()
  })
})

import { receitaVazia, validarReceita } from './form'
it('validar avulsa: fim = data e dia = dia da data', () => {
  const r = validarReceita({ ...receitaVazia(), nome: '13º', regra: 'AVULSA', valor: '9.201,00', inicio: '2026-11-30' })
  expect(r.ok && r.valor).toMatchObject({ regra: 'AVULSA', inicio: '2026-11-30', fim: '2026-11-30', dia_recebimento: 30, valor: 920100 })
})
