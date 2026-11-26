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

import { emAbertoNoCartao, marcaDePagamento, resumoDaFatura } from './rules'
import { l } from '../lancamento/fixtures'
import { totaisDaCompetencia } from '../lancamento/rules'

describe('pagamento de fatura', () => {
  const k = { id: 5, nome: 'K', limite: 100000, dia_fechamento: 3, dia_vencimento: 10, conta_pagamento_id: 1, arquivado: 0 as const, bandeira: null, final: null, emissor: null, anuidade: null, observacao: null, origem: 'MANUAL' as const }
  const compras = [l({ cartao_id: 5, conta_id: null, valor: 3000, data: '2026-11-10' }), l({ cartao_id: 5, conta_id: null, valor: 2000, data: '2026-11-20' })]
  it('parcial, paga e limite em aberto', () => {
    const pg = l({ valor: 1000, data: '2026-12-08', categoria_id: null, fatura_ref: marcaDePagamento(5, '2026-12') })
    expect(resumoDaFatura(k, [...compras, pg], '2026-12')).toMatchObject({ total: 5000, pago: 1000, emAberto: 4000, situacao: 'parcial' })
    expect(emAbertoNoCartao(k, [...compras, pg])).toBe(4000)
  })
  it('pagamento da fatura não conta como despesa do mês', () => {
    const pg = l({ valor: 5000, data: '2026-11-25', fatura_ref: marcaDePagamento(5, '2026-12') })
    expect(totaisDaCompetencia([...compras, pg], '2026-11').despesas).toBe(5000)
  })
})

import { fechamentoDaFatura } from './rules'
describe('fatura informada (app do banco)', () => {
  const k = { id: 1, nome: 'Itaú', limite: 1832100, dia_fechamento: 15, dia_vencimento: 18, conta_pagamento_id: 1, arquivado: 0 as const, bandeira: null, final: null, emissor: null, anuidade: null, observacao: null, origem: 'IA' as const }
  const inf = (competencia: string, valor: number) => ({ id: 0, cartao_id: 1, competencia, valor, observacao: null, origem: 'IA' as const })
  const informadas = [inf('2026-12', 1012589), inf('2027-01', 128129), inf('2027-02', 99462)]
  it('vale como total e entra no limite em aberto', () => {
    expect(resumoDaFatura(k, [], '2026-12', informadas)).toMatchObject({ total: 1012589, informado: 1012589, compras: 0, situacao: 'aberta' })
    expect(emAbertoNoCartao(k, [], informadas)).toBe(1012589 + 128129 + 99462)
  })
  it('pagamento abate a fatura informada', () => {
    const pg = l({ valor: 1012589, data: '2026-12-18', categoria_id: null, fatura_ref: marcaDePagamento(1, '2026-12') })
    expect(resumoDaFatura(k, [pg], '2026-12', informadas).situacao).toBe('paga')
  })
  it('fechamento da fatura', () => {
    expect(fechamentoDaFatura(k, '2026-12')).toBe('2026-12-15')
    expect(fechamentoDaFatura({ dia_fechamento: 28, dia_vencimento: 5 }, '2026-12')).toBe('2026-11-28')
  })
})
