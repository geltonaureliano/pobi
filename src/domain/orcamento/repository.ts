import { banco } from '../../db/client'
import type { Centavos } from '../../shared/dinheiro'
import type { Competencia } from '../../shared/data'
import type { Orcamento } from './model'

export async function listarOrcamentos(c: Competencia): Promise<(Orcamento & { categoria_nome: string })[]> {
  return (await banco()).select(
    `SELECT o.*, c.nome AS categoria_nome FROM orcamentos o JOIN categorias c ON c.id = o.categoria_id
     WHERE o.competencia = $1 ORDER BY c.nome`,
    [c],
  )
}

/** Cria ou atualiza o limite da categoria naquela competência. */
export async function salvarOrcamento(categoriaId: number, c: Competencia, limite: Centavos) {
  await (await banco()).execute(
    `INSERT INTO orcamentos (categoria_id, competencia, limite) VALUES ($1,$2,$3)
     ON CONFLICT (categoria_id, competencia) DO UPDATE SET limite = excluded.limite`,
    [categoriaId, c, limite],
  )
}

/** Copia os limites de um mês para outro, sem sobrescrever os que já existem. */
export async function copiarOrcamentos(de: Competencia, para: Competencia) {
  await (await banco()).execute(
    `INSERT OR IGNORE INTO orcamentos (categoria_id, competencia, limite)
     SELECT categoria_id, $2, limite FROM orcamentos WHERE competencia = $1`,
    [de, para],
  )
}

export async function excluirOrcamento(id: number) {
  await (await banco()).execute('DELETE FROM orcamentos WHERE id = $1', [id])
}
