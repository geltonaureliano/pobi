import { banco } from '../../db/client'
import type { Cartao, NovoCartao } from './model'

export async function listarCartoes(): Promise<Cartao[]> {
  return (await banco()).select('SELECT * FROM cartoes WHERE arquivado = 0 ORDER BY nome')
}

export async function criarCartao(c: NovoCartao) {
  const r = await (await banco()).execute(
    'INSERT INTO cartoes (nome, limite, dia_fechamento, dia_vencimento, conta_pagamento_id) VALUES ($1,$2,$3,$4,$5)',
    [c.nome, c.limite, c.dia_fechamento, c.dia_vencimento, c.conta_pagamento_id],
  )
  return r.lastInsertId
}
