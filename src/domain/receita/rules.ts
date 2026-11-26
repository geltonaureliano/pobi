import { dataNoMes, diasNoMes, type Competencia } from '../../shared/data'
import type { Centavos } from '../../shared/dinheiro'

export interface Vigente {
  valor: Centavos
  inicio: string
  fim: string | null
  ativa?: 0 | 1
  ativo?: 0 | 1
}

/** Pausado manualmente (ativa/ativo = 0) não conta, mesmo dentro da vigência. */
const pausado = (r: Vigente) => r.ativa === 0 || r.ativo === 0

/** Ativa se a vigência cruza a competência. */
export function ativaNaCompetencia(r: Vigente | Pick<Vigente, 'inicio' | 'fim'>, c: Competencia) {
  if ('valor' in r && pausado(r)) return false
  const primeiro = `${c}-01`
  const ultimo = dataNoMes(c, diasNoMes(c))
  return r.inicio <= ultimo && (r.fim == null || r.fim >= primeiro)
}

export const totalPrevisto = (itens: Vigente[], c: Competencia) =>
  itens.filter((i) => !pausado(i) && ativaNaCompetencia(i, c)).reduce((s, i) => s + i.valor, 0)
