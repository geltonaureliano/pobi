import { paraCentavos } from '../../shared/dinheiro'
import type { NovoCartao } from './model'

export interface CamposCartao { nome: string; limite: string; dia_fechamento: string; dia_vencimento: string; conta_pagamento_id: string }

const dia = (v: string) => (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 31 ? Number(v) : null)

export function validarCartao(f: CamposCartao) {
  const erros: Partial<Record<keyof CamposCartao, string>> = {}
  const limite = paraCentavos(f.limite)
  if (!f.nome.trim()) erros.nome = 'Informe o nome.'
  if (limite == null || limite < 0) erros.limite = 'Limite inválido.'
  if (dia(f.dia_fechamento) == null) erros.dia_fechamento = 'Dia de 1 a 31.'
  if (dia(f.dia_vencimento) == null) erros.dia_vencimento = 'Dia de 1 a 31.'
  if (Object.keys(erros).length) return { ok: false as const, erros }
  return {
    ok: true as const,
    valor: {
      nome: f.nome.trim(), limite: limite!, dia_fechamento: dia(f.dia_fechamento)!, dia_vencimento: dia(f.dia_vencimento)!,
      conta_pagamento_id: f.conta_pagamento_id ? Number(f.conta_pagamento_id) : null,
    } satisfies NovoCartao,
  }
}
