import { describe, expect, it } from 'vitest'
import { l } from '../lancamento/fixtures'
import { faixaDoScore, relatorioMensal, serieAnual } from './rules'

const base = {
  competencia: '2026-11', hoje: '2026-11-20',
  contas: [{ id: 9, nome: 'Reserva', tipo: 'INVESTIMENTO' as const, saldo_inicial: 0, principal: 0 as const, arquivada: 0 as const, saldo: 1200000 }],
  categorias: [{ id: 1, nome: 'Mercado', tipo: 'DESPESA' as const, cor: null, essencial: 1 as const }],
  receitas: [], custosFixos: [], parcelas: [],
}

describe('relatório mensal', () => {
  it('score cheio com 20%+ de poupança, sem compromissos, sem dívida e duas fontes', () => {
    const r = relatorioMensal({
      ...base,
      lancamentos: [
        l({ tipo: 'RECEITA', valor: 800000, categoria_nome: 'Salário', categoria_id: 7 }),
        l({ tipo: 'RECEITA', valor: 200000, categoria_nome: 'Freelance', categoria_id: 8 }),
        l({ valor: 600000 }),
      ],
    })
    expect(r.taxaPoupanca).toBe(0.4)
    expect(r.score.total).toBe(100)
    expect(r.essenciais).toBe(600000)
  })
  it('reserva em meses usa a média dos 3 meses anteriores e projeta a meta pela sobra', () => {
    const r = relatorioMensal({
      ...base,
      lancamentos: [
        l({ valor: 300000, data: '2026-08-10' }), l({ valor: 300000, data: '2026-09-10' }), l({ valor: 300000, data: '2026-10-10' }),
        l({ tipo: 'RECEITA', valor: 500000 }), l({ valor: 200000 }),
      ],
    })
    expect(r.reserva.despesaMedia).toBe(300000)
    expect(r.reserva.meses).toBe(4)
    expect(r.reserva.mesesParaMeta).toBe(2) // faltam 600.000 com sobra de 300.000
  })
  it('gasto maior que receita gera alerta e não projeta meta', () => {
    const r = relatorioMensal({ ...base, lancamentos: [l({ tipo: 'RECEITA', valor: 1000 }), l({ valor: 5000 })] })
    expect(r.alertas[0]).toMatch(/gastou mais/)
    expect(r.score.componentes[0].pontos).toBe(0)
  })
  it('faixas', () => {
    expect([85, 60, 45, 20, 5].map(faixaDoScore)).toEqual(['Excelente', 'Bom', 'Atenção', 'Crítico', 'Alerta'])
  })
})

describe('série anual', () => {
  it('acumula saldo e faz média só com meses que têm dados', () => {
    const s = serieAnual([l({ tipo: 'RECEITA', valor: 1000, data: '2026-01-05' }), l({ valor: 400, data: '2026-03-05' })], 2026)
    expect(s.meses[2].acumulado).toBe(600)
    expect(s.mesesComDados).toBe(2)
    expect(s.mediaReceitas).toBe(500)
  })
})
