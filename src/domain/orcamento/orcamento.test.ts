import { describe, expect, it } from 'vitest'
import { progressoDosOrcamentos, ritmoEsperado } from './rules'

describe('orçamentos', () => {
  const o = (categoria_id: number, limite: number) => ({ id: categoria_id, categoria_id, competencia: '2026-11', limite, categoria_nome: `c${categoria_id}` })
  it('calcula uso, estouro e ordena pelo mais usado', () => {
    const r = progressoDosOrcamentos([o(1, 1000), o(2, 500)], [{ categoria_id: 2, nome: 'c2', valor: 600, participacao: 1 }], '2026-11')
    expect(r[0]).toMatchObject({ gasto: 600, restante: -100, estourado: true })
    expect(r[1]).toMatchObject({ gasto: 0, usado: 0, estourado: false })
  })
  it('ritmo proporcional ao dia', () => expect(ritmoEsperado(15, 30)).toBe(0.5))
})
