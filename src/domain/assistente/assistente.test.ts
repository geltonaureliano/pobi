import { describe, expect, it } from 'vitest'
import { aplicarNaDivida, aplicarNaReceita, interpretarAssistente, montarPromptAssistente } from './rules'
import { camposDividaVazios, validarDivida } from '../divida/form'
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
    const base = { nome: '', valor: '', dia: '', inicio: '2026-01-01', fim: '', conta_id: '', cartao_id: '', categoria_id: '', observacao: '' }
    const r = aplicarNaReceita(base, { nome: 'Freela', tipo_valor: 'VARIAVEL', valor: 3000, valor_min: 2000, valor_max: 4500, dia_recebimento: 10 })
    expect(r).toMatchObject({ nome: 'Freela', tipo_valor: 'VARIAVEL', valor: '3.000,00', valor_min: '2.000,00', valor_max: '4.500,00', dia: '10' })
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
