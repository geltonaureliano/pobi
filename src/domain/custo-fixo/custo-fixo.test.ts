import { describe, expect, it } from 'vitest'
import { l } from '../lancamento/fixtures'
import { idDoGerado, lancamentosAGerar, situacaoDosCustos } from './rules'
import type { CustoFixo } from './model'

const cf = (p: Partial<CustoFixo>): CustoFixo => ({
  id: 1, nome: 'Aluguel', valor: 200000, dia_vencimento: 31, inicio: '2026-01-01', fim: null,
  conta_id: 1, cartao_id: null, categoria_id: 4, ativo: 1, observacao: null, origem: 'MANUAL', ...p,
})

describe('custos fixos', () => {
  it('reconhece pagamento manual com mesma categoria e valor, uma vez só', () => {
    const custos = [cf({ id: 1 }), cf({ id: 2 })]
    const s = situacaoDosCustos(custos, [l({ valor: 200000, categoria_id: 4 })], '2026-11')
    expect(s.map((x) => x.situacao)).toEqual(['pago', 'faltando'])
  })
  it('gera só o que falta, na data de vencimento ajustada ao mês, como pendente', () => {
    const g = lancamentosAGerar([cf({ id: 1 })], [], '2026-02')
    expect(g).toHaveLength(1)
    expect(g[0]).toMatchObject({ data: '2026-02-28', status: 'PENDENTE', id_externo: idDoGerado(1, '2026-02') })
  })
  it('não gera de novo o que já foi gerado e mostra como pendente', () => {
    const gerado = l({ status: 'PENDENTE', id_externo: idDoGerado(1, '2026-11'), valor: 200000 })
    expect(lancamentosAGerar([cf({})], [gerado], '2026-11')).toHaveLength(0)
    expect(situacaoDosCustos([cf({})], [gerado], '2026-11')[0].situacao).toBe('pendente')
  })
  it('pausado ou fora da vigência fica de fora', () => {
    expect(situacaoDosCustos([cf({ ativo: 0 }), cf({ id: 2, fim: '2026-10-31' })], [], '2026-11')).toHaveLength(0)
  })
  it('custo no cartão gera despesa no cartão, sem conta', () => {
    expect(lancamentosAGerar([cf({ cartao_id: 3 })], [], '2026-11')[0]).toMatchObject({ cartao_id: 3, conta_id: null })
  })
})
