import { describe, expect, it } from 'vitest'
import { aplicarNaDivida, aplicarNaReceita, interpretarAssistente, montarPromptAssistente } from './rules'
import { camposDividaVazios, validarDivida } from '../divida/form'
import { receitaVazia } from '../receita/form'
import { gerarParcelasFixas, taxaAnualDe } from '../divida/rules'

describe('interpretarAssistente', () => {
  it('lê JSON mesmo dentro de bloco de código', () => {
    const r = interpretarAssistente('aqui:\n```json\n{"resposta":"Ok","resumo":"Empréstimo","confianca":"alta","pendencias":["dia?",""],"rascunho":{"parcelas":12}}\n```')
    expect(r.resposta).toBe('Ok')
    expect(r.confianca).toBe('alta')
    expect(r.pendencias).toEqual(['dia?'])
    expect(r.rascunho).toEqual({ parcelas: 12 })
  })
  it('sem JSON, vira só resposta de chat', () => {
    expect(interpretarAssistente('Não entendi o arquivo.').rascunho).toEqual({})
  })
  it('JSON quebrado dá erro legível', () => {
    expect(() => interpretarAssistente('{"resposta": }')).toThrow()
  })
})

describe('aplicarNaDivida', () => {
  it('preenche só o que veio e converte para texto de formulário', () => {
    const f = { ...camposDividaVazios(), credor: 'Banco X' }
    const r = aplicarNaDivida(f, { nome: 'Carro', valor_parcela: 1234.5, parcelas: 48, taxa_mensal: 1.99, credor: null, tipo: 'financiamento', primeiro_vencimento: '2026-02-10' })
    expect(r.nome).toBe('Carro')
    expect(r.credor).toBe('Banco X')
    expect(r.modo).toBe('PARCELA')
    expect(r.valor_parcela).toBe('1.234,50')
    expect(r.parcelas).toBe('48')
    expect(r.taxa).toBe('1,99')
    expect(r.tipo).toBe('FINANCIAMENTO')
    expect(r.primeiro).toBe('2026-02-10')
  })
  it('aceita números em texto brasileiro', () => {
    expect(aplicarNaDivida(camposDividaVazios(), { total_a_pagar: 'R$ 10.500,00' }).total).toBe('10.500,00')
  })
})

describe('aplicarNaReceita', () => {
  it('receita variável com faixa', () => {
    const r = aplicarNaReceita(receitaVazia(), { nome: 'Freela', tipo_valor: 'VARIAVEL', valor: 3000, valor_min: 2000, valor_max: 4500, dia_recebimento: 10 })
    expect(r).toMatchObject({ nome: 'Freela', regra: 'VARIAVEL', valor: '3.000,00', valor_min: '2.000,00', valor_max: '4.500,00', dia: '10' })
  })
  it('receita por hora', () => {
    const r = aplicarNaReceita(receitaVazia(), { nome: 'Keyrus', valor_hora: 88, horas_dia: 8, desconto_pct: 6.15, defasagem_meses: 1 })
    expect(r).toMatchObject({ regra: 'HORAS', valor_hora: '88,00', horas_dia: '8', desconto_pct: '6,15', defasagem: '1' })
  })
})

describe('validarDivida', () => {
  it('com parcela fixa, total = parcela × N e parcelas pagas', () => {
    const f = { ...camposDividaVazios(), nome: 'Carro', valor_parcela: '1.000,00', parcelas: '10', parcelas_pagas: '3', primeiro: '2026-01-05', taxa: '1,5' }
    const r = validarDivida(f, true)
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.nova.total).toBe(1000000)
      expect(r.nova.valorParcela).toBe(100000)
      expect(r.nova.parcelasPagas).toBe(3)
      expect(r.nova.taxa_mensal).toBe(1.5)
    }
  })
  it('exige parcela no modo parcela e pagas ≤ total', () => {
    const r = validarDivida({ ...camposDividaVazios(), nome: 'X', parcelas: '2', parcelas_pagas: '5' }, true)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.erros).sort()).toEqual(['parcelas_pagas', 'valor_parcela'])
  })
})

describe('regras de dívida', () => {
  it('parcelas fixas', () => {
    expect(gerarParcelasFixas(5000, 3, '2026-01-31').map((p) => [p.valor, p.vencimento])).toEqual([
      [5000, '2026-01-31'], [5000, '2026-02-28'], [5000, '2026-03-31'],
    ])
  })
  it('taxa anual equivalente', () => {
    expect(taxaAnualDe(1).toFixed(2)).toBe('12.68')
  })
})

it('prompt leva rascunho, conversa e arquivos', () => {
  const p = montarPromptAssistente({
    alvo: 'divida', hoje: '2026-11-26', rascunhoAtual: { nome: 'Carro' }, arquivos: ['01-contrato.pdf'],
    historico: [{ id: '1', autor: 'voce', texto: 'meu financiamento', anexos: [{ nome: 'contrato.pdf', tamanho: 10 }] }],
  })
  expect(p).toContain('01-contrato.pdf')
  expect(p).toContain('"nome":"Carro"')
  expect(p).toContain('USUÁRIO: meu financiamento')
})

import { quandoLegivel, tituloDaConversa } from './rules'

describe('conversas salvas', () => {
  it('título prefere o nome, depois o resumo, depois a primeira mensagem', () => {
    const msgs = [{ id: '1', autor: 'voce' as const, texto: 'meu empréstimo do banco que peguei ano passado para reformar a casa', anexos: [] }]
    expect(tituloDaConversa('Carro', 'x', msgs)).toBe('Carro')
    expect(tituloDaConversa('', 'Empréstimo de 10 mil', msgs)).toBe('Empréstimo de 10 mil')
    expect(tituloDaConversa('', null, msgs)).toBe('meu empréstimo do banco que peguei ano passado para refor…')
    expect(tituloDaConversa('', null, [])).toBe('Nova conversa')
  })
  it('quando legível', () => {
    const agora = new Date('2026-11-26T13:00:00Z')
    expect(quandoLegivel('2026-11-26 12:59:40', agora)).toBe('agora')
    expect(quandoLegivel('2026-11-26 12:30:00', agora)).toBe('há 30 min')
  })
})

import { aplicarNoCusto, acharPorNome } from './rules'
import { custoVazio } from '../custo-fixo/form'

describe('custo fixo com IA', () => {
  const ctx = {
    categorias: [{ id: 1, nome: 'Moradia' }, { id: 2, nome: 'Assinaturas' }, { id: 3, nome: 'Saúde' }],
    contas: [{ id: 10, nome: 'Nubank' }, { id: 11, nome: 'Inter' }],
    cartoes: [{ id: 20, nome: 'Nubank Roxinho' }],
  }
  it('usa categoria e conta existentes, sem ligar para acento', () => {
    const r = aplicarNoCusto(custoVazio(), { nome: 'Aluguel', valor: 2500, dia_vencimento: 5, categoria: 'moradia', conta: 'inter' }, ctx)
    expect(r).toMatchObject({ nome: 'Aluguel', valor: '2.500,00', dia: '5', categoria_id: '1', categoria_nova: '', conta_id: '11' })
  })
  it('categoria que não existe vira sugestão de categoria nova', () => {
    const r = aplicarNoCusto(custoVazio(), { nome: 'Pet shop', categoria: 'Pets', categoria_nova: true }, ctx)
    expect(r).toMatchObject({ categoria_id: '', categoria_nova: 'Pets' })
  })
  it('cartão tem prioridade sobre conta', () => {
    expect(aplicarNoCusto(custoVazio('10'), { cartao: 'Nubank Roxinho' }, ctx)).toMatchObject({ cartao_id: '20', conta_id: '' })
  })
  it('acharPorNome aceita parte do nome quando é único', () => {
    expect(acharPorNome(ctx.categorias, 'saude')?.id).toBe(3)
    expect(acharPorNome(ctx.contas, 'Banco')).toBeNull()
  })
})

import { aplicarNoCartao } from './rules'
import { cartaoVazio, validarCartao } from '../cartao/form'

describe('cartão com IA', () => {
  const contas = [{ id: 1, nome: 'Nubank' }, { id: 2, nome: 'Itaú' }]
  it('guarda só os 4 últimos dígitos e acha a conta', () => {
    const r = aplicarNoCartao(cartaoVazio(), { nome: 'Itaú Black', bandeira: 'master', final: '5162 1234 5678 9012', limite: 25000, dia_fechamento: 3, dia_vencimento: 10, conta_pagamento: 'itau' }, contas)
    expect(r).toMatchObject({ nome: 'Itaú Black', bandeira: 'Mastercard', final: '9012', limite: '25.000,00', dia_fechamento: '3', dia_vencimento: '10', conta_pagamento_id: '2' })
  })
  it('validar recusa final com tamanho errado', () => {
    const r = validarCartao({ ...cartaoVazio(), nome: 'X', limite: '0', dia_fechamento: '1', dia_vencimento: '8', final: '12' })
    expect(r.ok).toBe(false)
  })
})

describe('faturas pelo chat', () => {
  it('vira lista por mês de vencimento, ordenada e sem duplicar', () => {
    const base = { ...cartaoVazio(), faturas: [{ competencia: '2027-01', valor: '1.000,00' }] }
    const r = aplicarNoCartao(base, { faturas: [{ mes: '2026-12', valor: 10125.89 }, { mes: '2027-01', valor: '1.281,29' }, { mes: 'jan', valor: 1 }] }, [])
    expect(r.faturas).toEqual([{ competencia: '2026-12', valor: '10.125,89' }, { competencia: '2027-01', valor: '1.281,29' }])
  })
})
