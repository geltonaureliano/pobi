import { describe, expect, it } from 'vitest'
import { l } from './fixtures'
import { despesaPorCategoria, efeitoNaConta, totaisDaCompetencia } from './rules'
import { validarLancamento } from './form'
import { lerCSV } from './importacao'

describe('totais', () => {
  it('ignora transferência, cancelado, pendente e outros meses', () => {
    const ls = [
      l({ tipo: 'RECEITA', valor: 5000 }), l({ valor: 1200 }),
      l({ tipo: 'TRANSFERENCIA', valor: 999, conta_destino_id: 2 }), l({ status: 'CANCELADO', valor: 999 }),
      l({ status: 'PENDENTE', valor: 999 }), l({ data: '2026-10-31', valor: 999 }),
    ]
    expect(totaisDaCompetencia(ls, '2026-11')).toEqual({ receitas: 5000, despesas: 1200, resultado: 3800 })
  })
  it('ranking de categorias soma 100%', () => {
    const r = despesaPorCategoria([l({ valor: 300 }), l({ valor: 100, categoria_id: 2, categoria_nome: 'Lazer' })], '2026-11')
    expect(r.map((f) => f.nome)).toEqual(['Mercado', 'Lazer'])
    expect(r[0].participacao).toBe(0.75)
  })
})

describe('efeito na conta', () => {
  it('transferência sai da origem e entra no destino; cartão não mexe na conta', () => {
    const t = l({ tipo: 'TRANSFERENCIA', valor: 500, conta_id: 1, conta_destino_id: 2 })
    expect(efeitoNaConta(t, 1)).toBe(-500)
    expect(efeitoNaConta(t, 2)).toBe(500)
    expect(efeitoNaConta(l({ cartao_id: 1, conta_id: 1 }), 1)).toBe(0)
    expect(efeitoNaConta(l({ status: 'PENDENTE' }), 1)).toBe(0)
  })
})

describe('formulário', () => {
  const base = { descricao: 'Mercado', valor: '1.234,56', tipo: 'DESPESA' as const, data: '2026-11-10', conta_id: '1', conta_destino_id: '', cartao_id: '', categoria_id: '3', pendente: false }
  it('converte valor para centavos', () => {
    const r = validarLancamento(base)
    expect(r.ok && r.valor.valor).toBe(123456)
  })
  it('exige conta ou cartão e rejeita transferência para a mesma conta', () => {
    expect(validarLancamento({ ...base, conta_id: '' }).ok).toBe(false)
    const t = validarLancamento({ ...base, tipo: 'TRANSFERENCIA', conta_destino_id: '1' })
    expect(!t.ok && t.erros.conta_destino_id).toBeTruthy()
  })
  it('rejeita data inexistente', () => {
    expect(validarLancamento({ ...base, data: '2026-02-30' }).ok).toBe(false)
  })
})

describe('importação CSV', () => {
  const csv = 'Data;Histórico;Valor\n10/11/2026;Mercado;-123,45\n10/11/2026;Mercado;-123,45\n05/11/2026;Salário;5.000,00\n99/99/2026;Ruim;10'
  it('lê sinais, datas BR e marca duplicatas legítimas com ocorrências diferentes', () => {
    const r = lerCSV(csv, 1)
    expect(r.linhas).toHaveLength(3)
    expect(r.linhas[0]).toMatchObject({ data: '2026-11-10', valor: 12345, tipo: 'DESPESA' })
    expect(r.linhas[2]).toMatchObject({ valor: 500000, tipo: 'RECEITA' })
    expect(r.linhas[0].id_externo).not.toBe(r.linhas[1].id_externo)
    expect(r.ignoradas).toEqual([{ linha: 5, motivo: 'Data inválida.' }])
  })
  it('reimportar gera os mesmos ids', () => {
    expect(lerCSV(csv, 1).linhas.map((x) => x.id_externo)).toEqual(lerCSV(csv, 1).linhas.map((x) => x.id_externo))
  })
  it('recusa arquivo sem as colunas necessárias', () => {
    expect(lerCSV('a,b\n1,2', 1).ignoradas[0].motivo).toMatch(/Cabeçalho/)
  })
})
