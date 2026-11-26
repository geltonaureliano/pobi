import { banco } from '../../db/client'
import type { DataISO } from '../../shared/data'
import type { LancamentoDetalhado, NovoLancamento } from './model'

const SELECT = `SELECT l.*, c.nome AS categoria_nome FROM lancamentos l LEFT JOIN categorias c ON c.id = l.categoria_id`

export async function listarLancamentos(inicio: DataISO, fim: DataISO): Promise<LancamentoDetalhado[]> {
  const db = await banco()
  return db.select(`${SELECT} WHERE l.data BETWEEN $1 AND $2 ORDER BY l.data DESC, l.id DESC`, [inicio, fim])
}

export async function todosLancamentos(): Promise<LancamentoDetalhado[]> {
  const db = await banco()
  return db.select(`${SELECT} ORDER BY l.data DESC, l.id DESC`)
}

export async function criarLancamento(l: NovoLancamento): Promise<number | undefined> {
  const db = await banco()
  const r = await db.execute(
    `INSERT INTO lancamentos (descricao, valor, tipo, status, data, conta_id, conta_destino_id, cartao_id, categoria_id, parcela_id, origem, id_externo, observacao)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [l.descricao, l.valor, l.tipo, l.status, l.data, l.conta_id, l.conta_destino_id, l.cartao_id, l.categoria_id,
      l.parcela_id ?? null, l.origem ?? 'MANUAL', l.id_externo ?? null, l.observacao],
  )
  return r.lastInsertId
}

/** Insere ignorando linhas já importadas (mesmo id_externo). Retorna quantas entraram. */
export async function importarLancamentos(ls: NovoLancamento[]): Promise<number> {
  const db = await banco()
  let n = 0
  for (const l of ls) {
    const r = await db.execute(
      `INSERT OR IGNORE INTO lancamentos (descricao, valor, tipo, status, data, conta_id, categoria_id, origem, id_externo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'IMPORTACAO',$8)`,
      [l.descricao, l.valor, l.tipo, l.status, l.data, l.conta_id, l.categoria_id, l.id_externo ?? null],
    )
    n += r.rowsAffected
  }
  return n
}

export async function excluirLancamento(id: number) {
  const db = await banco()
  await db.execute('DELETE FROM lancamentos WHERE id = $1', [id])
}
