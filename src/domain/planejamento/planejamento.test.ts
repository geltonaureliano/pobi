import { describe, expect, it } from 'vitest'
import { fluxoDoMes, planoDoAno, planoDoMes, type EntradaPlano } from './rules'

const cartao = { id: 1, nome: 'Itaú', limite: 1000000, dia_fechamento: 15, dia_vencimento: 18, conta_pagamento_id: 1, arquivado: 0 as const, bandeira: null, final: null, emissor: null, anuidade: null, observacao: null, origem: 'IA' as const }
const base: EntradaPlano = {
  receitas: [
    { id: 1, nome: 'Salário', valor: 1200000, dia_recebimento: 5, inicio: '2026-01-01', fim: null, conta_id: 1, categoria_id: null, ativa: 1, observacao: null, tipo_valor: 'FIXA', valor_min: null, valor_max: null, fonte: null, origem: 'MANUAL', regra: 'FIXA', valor_hora: null, horas_dia: null, desconto_pct: null, defasagem_meses: 1 },
    { id: 2, nome: '13º', valor: 900000, dia_recebimento: 30, inicio: '2026-11-30', fim: '2026-11-30', conta_id: 1, categoria_id: null, ativa: 1, observacao: null, tipo_valor: 'FIXA', valor_min: null, valor_max: null, fonte: null, origem: 'MANUAL', regra: 'AVULSA', valor_hora: null, horas_dia: null, desconto_pct: null, defasagem_meses: 1 },
  ],
  custosFixos: [
    { id: 1, nome: 'Aluguel', valor: 250000, dia_vencimento: 10, inicio: '2026-01-01', fim: null, conta_id: 1, cartao_id: null, categoria_id: 1, ativo: 1, observacao: null, origem: 'MANUAL' },
    { id: 2, nome: 'Netflix', valor: 5000, dia_vencimento: 3, inicio: '2026-01-01', fim: null, conta_id: null, cartao_id: 1, categoria_id: 2, ativo: 1, observacao: null, origem: 'MANUAL' },
  ],
  cartoes: [cartao],
  faturas: [{ id: 1, cartao_id: 1, competencia: '2026-12', valor: 1012589, observacao: null, origem: 'IA' }],
  dividas: [{ id: 1, nome: 'Carro', credor: null, valor_total: 2400000, taxa_mensal: null, status: 'ATIVA', categoria_id: null, tipo: null, valor_contratado: null, taxa_anual: null, cet_anual: null, sistema: null, data_contratacao: null, observacao: null, origem: 'MANUAL' }],
  parcelas: [{ id: 1, divida_id: 1, numero: 3, valor: 100000, vencimento: '2026-12-20', pago_em: null, valor_pago: null }],
  lancamentos: [],
  categorias: [{ id: 1, nome: 'Moradia', tipo: 'DESPESA', cor: '#000', essencial: 1 }, { id: 2, nome: 'Assinaturas', tipo: 'DESPESA', cor: null, essencial: 0 }],
  contas: [],
}

describe('plano do mês (receitas × custos + faturas + parcelas)', () => {
  it('dezembro: fatura informada já inclui o custo no cartão', () => {
    const p = planoDoMes(base, '2026-12')
    expect(p.entradas).toBe(1200000)
    expect(p.custos).toBe(250000) // Netflix fica dentro da fatura informada
    expect(p.faturas).toBe(1012589)
    expect(p.parcelas).toBe(100000)
    expect(p.livre).toBe(1200000 - 250000 - 1012589 - 100000)
    expect(p.eventos.map((e) => e.tipo)).toEqual(['receita', 'custo', 'fatura', 'parcela'])
  })
  it('sem fatura informada, o custo no cartão conta à parte; avulsa só no mês dela', () => {
    const p = planoDoMes(base, '2026-11')
    expect(p.entradas).toBe(2100000)
    expect(p.custos).toBe(255000)
    expect(p.faturas).toBe(0)
  })
  it('fluxo do mês e saldo projetado', () => {
    const p = planoDoMes(base, '2026-12')
    const f = fluxoDoMes(p, 100000)
    expect(f.final).toBe(100000 + p.livre)
    expect(f.menor.data).toBe('2026-12-20')
    const ano = planoDoAno(base, '2026-12', 0)
    expect(ano).toHaveLength(12)
    expect(ano[0].saldoProjetado).toBe(p.livre)
  })
})

import { saldoDoMes } from './rules'
it('saldo do mês até o dia e no fechamento', () => {
  const p = planoDoMes(base, '2026-12')
  const s = saldoDoMes(p, '2026-12-12')
  expect(s.entrou).toBe(1200000)
  expect(s.saiu).toBe(250000)
  expect(s.ateHoje).toBe(950000)
  expect(s.aPagar).toBe(1012589 + 100000)
  expect(s.fechamento).toBe(p.livre)
})
