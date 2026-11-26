import { banco } from '../../db/client'
import type { Cartao, NovoCartao } from './model'

export async function listarCartoes(): Promise<Cartao[]> {
  return (await banco()).select('SELECT * FROM cartoes WHERE arquivado = 0 ORDER BY nome')
}

/** Inclui arquivados: lançamentos antigos ainda apontam para eles. */
export async function listarCartoesTodos(): Promise<Cartao[]> {
  return (await banco()).select('SELECT * FROM cartoes ORDER BY arquivado, nome')
}

export async function criarCartao(c: NovoCartao) {
  const r = await (await banco()).execute(
    'INSERT INTO cartoes (nome, limite, dia_fechamento, dia_vencimento, conta_pagamento_id) VALUES ($1,$2,$3,$4,$5)',
    [c.nome, c.limite, c.dia_fechamento, c.dia_vencimento, c.conta_pagamento_id],
  )
  return r.lastInsertId
}

export async function atualizarCartao(id: number, c: NovoCartao) {
  await (await banco()).execute(
    'UPDATE cartoes SET nome = $2, limite = $3, dia_fechamento = $4, dia_vencimento = $5, conta_pagamento_id = $6 WHERE id = $1',
    [id, c.nome, c.limite, c.dia_fechamento, c.dia_vencimento, c.conta_pagamento_id])
}

/** Cartão com compras é arquivado em vez de excluído, para manter o histórico. */
export async function excluirCartao(id: number) {
  const db = await banco()
  const [{ n }] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM lancamentos WHERE cartao_id = $1', [id])
  if (n > 0) await db.execute('UPDATE cartoes SET arquivado = 1 WHERE id = $1', [id])
  else await db.execute('DELETE FROM cartoes WHERE id = $1', [id])
}
