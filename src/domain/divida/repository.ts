import { banco } from '../../db/client'
import type { Centavos } from '../../shared/dinheiro'
import type { DataISO } from '../../shared/data'
import type { Divida, Parcela } from './model'
import { gerarParcelas } from './rules'

export async function listarDividas(): Promise<Divida[]> {
  return (await banco()).select("SELECT * FROM dividas ORDER BY status = 'ATIVA' DESC, nome")
}

export async function listarParcelas(): Promise<Parcela[]> {
  return (await banco()).select('SELECT * FROM parcelas ORDER BY vencimento')
}

export async function criarDivida(d: { nome: string; credor: string | null; total: Centavos; parcelas: number; primeiroVencimento: DataISO; taxa_mensal: number | null }) {
  const db = await banco()
  const r = await db.execute('INSERT INTO dividas (nome, credor, valor_total, taxa_mensal) VALUES ($1,$2,$3,$4)', [
    d.nome, d.credor, d.total, d.taxa_mensal,
  ])
  for (const p of gerarParcelas(d.total, d.parcelas, d.primeiroVencimento)) {
    await db.execute('INSERT INTO parcelas (divida_id, numero, valor, vencimento) VALUES ($1,$2,$3,$4)', [
      r.lastInsertId, p.numero, p.valor, p.vencimento,
    ])
  }
  return r.lastInsertId
}

/** Marca a parcela como paga e quita a dívida quando não sobra parcela em aberto. */
export async function pagarParcela(parcelaId: number, data: DataISO, valor: Centavos) {
  const db = await banco()
  await db.execute('UPDATE parcelas SET pago_em = $2, valor_pago = $3 WHERE id = $1', [parcelaId, data, valor])
  await db.execute(
    `UPDATE dividas SET status = 'QUITADA' WHERE id = (SELECT divida_id FROM parcelas WHERE id = $1)
     AND NOT EXISTS (SELECT 1 FROM parcelas WHERE divida_id = dividas.id AND pago_em IS NULL)`,
    [parcelaId],
  )
}
