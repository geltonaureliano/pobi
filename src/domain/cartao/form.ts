import { centavosParaTexto, paraCentavos } from '../../shared/dinheiro'
import type { Cartao, NovoCartao } from './model'

export interface CamposCartao {
  nome: string; limite: string; dia_fechamento: string; dia_vencimento: string; conta_pagamento_id: string
  bandeira: string; final: string; emissor: string; anuidade: string; observacao: string
}

export const cartaoVazio = (conta = ''): CamposCartao => ({
  nome: '', limite: '', dia_fechamento: '', dia_vencimento: '', conta_pagamento_id: conta, bandeira: '', final: '', emissor: '', anuidade: '', observacao: '',
})

export const camposDeCartao = (k: Cartao): CamposCartao => ({
  nome: k.nome, limite: centavosParaTexto(k.limite), dia_fechamento: String(k.dia_fechamento), dia_vencimento: String(k.dia_vencimento),
  conta_pagamento_id: k.conta_pagamento_id ? String(k.conta_pagamento_id) : '', bandeira: k.bandeira ?? '', final: k.final ?? '',
  emissor: k.emissor ?? '', anuidade: centavosParaTexto(k.anuidade), observacao: k.observacao ?? '',
})

const dia = (v: string) => (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 31 ? Number(v) : null)

export function validarCartao(f: CamposCartao) {
  const erros: Partial<Record<keyof CamposCartao, string>> = {}
  const limite = paraCentavos(f.limite)
  if (!f.nome.trim()) erros.nome = 'Informe o nome.'
  if (limite == null || limite < 0) erros.limite = 'Limite inválido.'
  if (dia(f.dia_fechamento) == null) erros.dia_fechamento = 'Dia de 1 a 31.'
  if (dia(f.dia_vencimento) == null) erros.dia_vencimento = 'Dia de 1 a 31.'
  const final = f.final.replace(/\D/g, '')
  if (final && final.length !== 4) erros.final = 'Só os 4 últimos dígitos.'
  const anuidade = f.anuidade.trim() ? paraCentavos(f.anuidade) : null
  if (f.anuidade.trim() && !(anuidade != null && anuidade >= 0)) erros.anuidade = 'Valor inválido.'
  if (Object.keys(erros).length) return { ok: false as const, erros }
  return {
    ok: true as const,
    valor: {
      nome: f.nome.trim(), limite: limite!, dia_fechamento: dia(f.dia_fechamento)!, dia_vencimento: dia(f.dia_vencimento)!,
      conta_pagamento_id: f.conta_pagamento_id ? Number(f.conta_pagamento_id) : null,
      bandeira: f.bandeira || null, final: final || null, emissor: f.emissor.trim() || null, anuidade, observacao: f.observacao.trim() || null,
    } satisfies NovoCartao,
  }
}
