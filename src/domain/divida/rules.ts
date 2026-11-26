import type { Centavos } from '../../shared/dinheiro'
import { competenciaDe, dataNoMes, deslocarCompetencia, type DataISO } from '../../shared/data'
import type { Parcela } from './model'

/** Divide o total em N parcelas mensais; os centavos que sobram vão para a última. */
export function gerarParcelas(total: Centavos, n: number, primeiroVencimento: DataISO) {
  if (n < 1 || total <= 0) return []
  const base = Math.floor(total / n)
  const dia = Number(primeiroVencimento.slice(8, 10))
  const c0 = competenciaDe(primeiroVencimento)
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    valor: i === n - 1 ? total - base * (n - 1) : base,
    vencimento: dataNoMes(deslocarCompetencia(c0, i), dia),
  }))
}

export const parcelaPaga = (p: Pick<Parcela, 'pago_em'>) => p.pago_em != null

/** Saldo devedor nominal: soma das parcelas em aberto. Não calcula juros presumidos. */
export const saldoDevedor = (ps: Parcela[]) => ps.filter((p) => !parcelaPaga(p)).reduce((s, p) => s + p.valor, 0)

export const parcelasAtrasadas = (ps: Parcela[], hoje: DataISO) =>
  ps.filter((p) => !parcelaPaga(p) && p.vencimento < hoje)

export const proximasParcelas = (ps: Parcela[], hoje: DataISO, ate: DataISO) =>
  ps.filter((p) => !parcelaPaga(p) && p.vencimento >= hoje && p.vencimento <= ate)

export const progressoDaDivida = (ps: Parcela[]) => {
  const total = ps.reduce((s, p) => s + p.valor, 0)
  return total ? (total - saldoDevedor(ps)) / total : 0
}
