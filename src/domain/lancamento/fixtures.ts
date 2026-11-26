import type { LancamentoDetalhado } from './model'

/** Fábrica de lançamentos para testes. */
let id = 0
export const l = (p: Partial<LancamentoDetalhado>): LancamentoDetalhado => ({
  id: ++id, descricao: 'x', valor: 1000, tipo: 'DESPESA', status: 'PAGO', data: '2026-11-10',
  conta_id: 1, conta_destino_id: null, cartao_id: null, categoria_id: 1, parcela_id: null,
  origem: 'MANUAL', id_externo: null, observacao: null, fatura_ref: null, categoria_nome: 'Mercado', ...p,
})

