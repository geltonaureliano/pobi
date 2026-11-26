import { dataNoMes, diasNoMes, type Competencia } from '../../shared/data'
import type { Centavos } from '../../shared/dinheiro'

export interface Vigente {
  valor: Centavos
  inicio: string
  fim: string | null
}

/** Ativa se a vigência cruza a competência. */
export function ativaNaCompetencia(r: Pick<Vigente, 'inicio' | 'fim'>, c: Competencia) {
  const primeiro = `${c}-01`
  const ultimo = dataNoMes(c, diasNoMes(c))
  return r.inicio <= ultimo && (r.fim == null || r.fim >= primeiro)
}

export const totalPrevisto = (itens: Vigente[], c: Competencia) =>
  itens.filter((i) => ativaNaCompetencia(i, c)).reduce((s, i) => s + i.valor, 0)
