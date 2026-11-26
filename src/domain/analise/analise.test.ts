import { describe, expect, it } from 'vitest'
import { l } from '../lancamento/fixtures'
import { interpretarResposta, montarPrompt, montarResumo } from './rules'

describe('análise', () => {
  const resumo = montarResumo({
    competencia: '2026-11', hoje: '2026-11-20',
    lancamentos: [l({ tipo: 'RECEITA', valor: 1000000, categoria_nome: 'Salário', categoria_id: 9 }), l({ valor: 123456, descricao: 'Mercado grande' })],
    contas: [{ id: 1, nome: 'A', tipo: 'CORRENTE', saldo_inicial: 0, principal: 1, arquivada: 0, saldo: 876544 }],
    categorias: [{ id: 1, nome: 'Mercado', tipo: 'DESPESA', cor: null, essencial: 1 }],
    orcamentos: [], receitas: [], custosFixos: [], parcelas: [],
  })
  it('envia reais agregados, não centavos nem o extrato', () => {
    expect(resumo.meses[2]).toEqual({ competencia: '2026-11', receitas: 10000, despesas: 1234.56 })
    expect(resumo.categorias[0]).toMatchObject({ nome: 'Mercado', essencial: true, valor: 1234.56 })
    expect(resumo.maioresGastos).toHaveLength(1)
    expect(montarPrompt(resumo)).toContain('"saldoContas": 8765.44')
  })
  it('aceita JSON cercado de texto e descarta itens inválidos', () => {
    const r = interpretarResposta('ok:\n```json\n{"manchete":"M","resumo":"R","insights":[{"titulo":"t","detalhe":"d","severidade":"atencao","evidencia":"e"},{"titulo":"x","severidade":"??"}],"plano":[{"acao":"a","prazo":"semana"}],"pontosCegos":["p",3]}\n```')
    expect(r.insights).toHaveLength(1)
    expect(r.plano[0]).toEqual({ acao: 'a', porque: '', prazo: 'semana' })
    expect(r.pontosCegos).toEqual(['p'])
  })
  it('rejeita resposta sem JSON ou sem manchete', () => {
    expect(() => interpretarResposta('não sei')).toThrow(/JSON/)
    expect(() => interpretarResposta('{"resumo":"r"}')).toThrow(/manchete/)
  })
})
