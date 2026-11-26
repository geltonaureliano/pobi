import { centavosParaTexto } from '../../shared/dinheiro'
import { competenciaDe, hoje } from '../../shared/data'
import { validarRecorrente, type CamposRecorrente } from '../../shared/recorrente'
import type { CustoFixo, NovoCustoFixo } from './model'

/** Formulário de custo fixo. `categoria_nova` é o nome de uma categoria a criar ao salvar. */
export interface CamposCusto extends CamposRecorrente {
  categoria_nova: string
}

export const custoVazio = (conta_id = ''): CamposCusto => ({
  nome: '', valor: '', dia: '', inicio: `${competenciaDe(hoje())}-01`, fim: '', conta_id, cartao_id: '', categoria_id: '', observacao: '', categoria_nova: '',
})

export const camposDeCusto = (c: CustoFixo): CamposCusto => ({
  nome: c.nome, valor: centavosParaTexto(c.valor), dia: c.dia_vencimento ? String(c.dia_vencimento) : '', inicio: c.inicio, fim: c.fim ?? '',
  conta_id: c.conta_id ? String(c.conta_id) : '', cartao_id: c.cartao_id ? String(c.cartao_id) : '',
  categoria_id: c.categoria_id ? String(c.categoria_id) : '', observacao: c.observacao ?? '', categoria_nova: '',
})

export function validarCusto(f: CamposCusto):
  | { ok: true; valor: NovoCustoFixo; categoriaNova: string | null }
  | { ok: false; erros: Partial<Record<keyof CamposCusto, string>> } {
  const r = validarRecorrente(f, true)
  if (!r.ok) return r
  const v = r.valor
  const categoriaNova = !f.categoria_id && f.categoria_nova.trim() ? f.categoria_nova.trim() : null
  return {
    ok: true,
    categoriaNova,
    valor: { nome: v.nome, valor: v.valor, dia_vencimento: v.dia, inicio: v.inicio, fim: v.fim, conta_id: v.conta_id, cartao_id: v.cartao_id, categoria_id: v.categoria_id, observacao: v.observacao },
  }
}
