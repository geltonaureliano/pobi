import { paraCentavos } from './dinheiro'
import { dataValida } from './data'

/** Campos comuns a receitas e custos fixos (itens recorrentes com vigência). */
export interface CamposRecorrente {
  nome: string
  valor: string
  dia: string
  inicio: string
  fim: string
  conta_id: string
  cartao_id: string
  categoria_id: string
  observacao: string
}

export function validarRecorrente(f: CamposRecorrente, permiteCartao: boolean) {
  const erros: Partial<Record<keyof CamposRecorrente, string>> = {}
  const valor = paraCentavos(f.valor)
  const dia = f.dia.trim() ? Number(f.dia) : null
  if (!f.nome.trim()) erros.nome = 'Informe o nome.'
  if (valor == null || valor <= 0) erros.valor = 'Valor maior que zero.'
  if (dia != null && !(Number.isInteger(dia) && dia >= 1 && dia <= 31)) erros.dia = 'Dia de 1 a 31.'
  if (!dataValida(f.inicio)) erros.inicio = 'Data inválida.'
  if (f.fim && !dataValida(f.fim)) erros.fim = 'Data inválida.'
  if (f.fim && dataValida(f.fim) && f.fim < f.inicio) erros.fim = 'O fim precisa ser depois do início.'
  if (permiteCartao && f.conta_id && f.cartao_id) erros.cartao_id = 'Escolha conta ou cartão, não os dois.'
  if (Object.keys(erros).length) return { ok: false as const, erros }
  return {
    ok: true as const,
    valor: {
      nome: f.nome.trim(), valor: valor!, dia, inicio: f.inicio, fim: f.fim || null,
      conta_id: f.conta_id ? Number(f.conta_id) : null,
      cartao_id: permiteCartao && f.cartao_id ? Number(f.cartao_id) : null,
      categoria_id: f.categoria_id ? Number(f.categoria_id) : null,
      observacao: f.observacao.trim() || null,
    },
  }
}
