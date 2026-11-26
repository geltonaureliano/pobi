import { paraCentavos } from '../../shared/dinheiro'
import { dataValida } from '../../shared/data'
import type { NovoLancamento, TipoLancamento } from './model'

export interface CamposLancamento {
  descricao: string
  valor: string
  tipo: TipoLancamento
  data: string
  conta_id: string
  conta_destino_id: string
  cartao_id: string
  categoria_id: string
  pendente: boolean
}

export type Erros<T> = Partial<Record<keyof T, string>>

const id = (v: string) => (v ? Number(v) : null)

export function validarLancamento(
  f: CamposLancamento,
): { ok: true; valor: NovoLancamento } | { ok: false; erros: Erros<CamposLancamento> } {
  const erros: Erros<CamposLancamento> = {}
  const valor = paraCentavos(f.valor)
  if (!f.descricao.trim()) erros.descricao = 'Informe uma descrição.'
  if (valor == null || valor <= 0) erros.valor = 'Informe um valor maior que zero.'
  if (!dataValida(f.data)) erros.data = 'Data inválida.'
  if (f.tipo === 'TRANSFERENCIA') {
    if (!f.conta_id) erros.conta_id = 'Escolha a conta de origem.'
    if (!f.conta_destino_id) erros.conta_destino_id = 'Escolha a conta de destino.'
    if (f.conta_id && f.conta_id === f.conta_destino_id) erros.conta_destino_id = 'Origem e destino precisam ser diferentes.'
  } else if (!f.conta_id && !f.cartao_id) {
    erros.conta_id = 'Escolha uma conta ou um cartão.'
  }
  if (f.tipo === 'RECEITA' && f.cartao_id) erros.cartao_id = 'Receita não entra em cartão.'
  if (Object.keys(erros).length) return { ok: false, erros }
  return {
    ok: true,
    valor: {
      descricao: f.descricao.trim(),
      valor: valor!,
      tipo: f.tipo,
      status: f.pendente ? 'PENDENTE' : 'PAGO',
      data: f.data,
      // Despesa no cartão não sai da conta agora; sai quando a fatura é paga.
      conta_id: f.tipo !== 'TRANSFERENCIA' && f.cartao_id ? null : id(f.conta_id),
      conta_destino_id: f.tipo === 'TRANSFERENCIA' ? id(f.conta_destino_id) : null,
      cartao_id: f.tipo === 'TRANSFERENCIA' ? null : id(f.cartao_id),
      categoria_id: f.tipo === 'TRANSFERENCIA' ? null : id(f.categoria_id),
      observacao: null,
    },
  }
}
