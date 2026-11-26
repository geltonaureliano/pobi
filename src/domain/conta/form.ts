import { paraCentavos } from '../../shared/dinheiro'
import type { NovaConta, TipoConta } from './model'

export function validarConta(f: { nome: string; tipo: TipoConta; saldo_inicial: string }) {
  const erros: Record<string, string> = {}
  const saldo = f.saldo_inicial.trim() ? paraCentavos(f.saldo_inicial) : 0
  if (!f.nome.trim()) erros.nome = 'Informe o nome da conta.'
  if (saldo == null) erros.saldo_inicial = 'Saldo inválido.'
  if (Object.keys(erros).length) return { ok: false as const, erros }
  return { ok: true as const, valor: { nome: f.nome.trim(), tipo: f.tipo, saldo_inicial: saldo! } satisfies NovaConta }
}
