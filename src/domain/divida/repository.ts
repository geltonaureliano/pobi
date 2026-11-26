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

export interface NovaDivida {
  nome: string
  credor: string | null
  total: Centavos
  parcelas: number
  primeiroVencimento: DataISO
  taxa_mensal: number | null
  categoria_id: number | null
}

export async function criarDivida(d: NovaDivida) {
  const db = await banco()
  const r = await db.execute('INSERT INTO dividas (nome, credor, valor_total, taxa_mensal, categoria_id) VALUES ($1,$2,$3,$4,$5)', [
    d.nome, d.credor, d.total, d.taxa_mensal, d.categoria_id,
  ])
  for (const p of gerarParcelas(d.total, d.parcelas, d.primeiroVencimento)) {
    await db.execute('INSERT INTO parcelas (divida_id, numero, valor, vencimento) VALUES ($1,$2,$3,$4)', [
      r.lastInsertId, p.numero, p.valor, p.vencimento,
    ])
  }
  return r.lastInsertId
}

/** Edita só os dados descritivos; parcelas já geradas não mudam. */
export async function atualizarDivida(id: number, d: { nome: string; credor: string | null; taxa_mensal: number | null; status: Divida['status'] }) {
  await (await banco()).execute('UPDATE dividas SET nome=$2, credor=$3, taxa_mensal=$4, status=$5 WHERE id=$1', [id, d.nome, d.credor, d.taxa_mensal, d.status])
}

export async function atualizarParcela(id: number, valor: Centavos, vencimento: DataISO) {
  await (await banco()).execute('UPDATE parcelas SET valor=$2, vencimento=$3 WHERE id=$1 AND pago_em IS NULL', [id, valor, vencimento])
}

/** Exclui a dívida e as parcelas; os lançamentos de pagamento ficam (são dinheiro que já saiu). */
export async function excluirDivida(id: number) {
  const db = await banco()
  await db.execute('UPDATE lancamentos SET parcela_id = NULL WHERE parcela_id IN (SELECT id FROM parcelas WHERE divida_id = $1)', [id])
  await db.execute('DELETE FROM parcelas WHERE divida_id = $1', [id])
  await db.execute('DELETE FROM dividas WHERE id = $1', [id])
}

/**
 * Paga a parcela: marca como paga, cria a despesa na conta escolhida (ligada à
 * parcela) e quita a dívida quando não sobra parcela em aberto.
 */
export async function pagarParcela(p: { parcela: Parcela; divida: Divida; data: DataISO; valor: Centavos; conta_id: number | null; categoria_id: number | null }) {
  const db = await banco()
  await db.execute('UPDATE parcelas SET pago_em = $2, valor_pago = $3 WHERE id = $1', [p.parcela.id, p.data, p.valor])
  if (p.conta_id) {
    await db.execute(
      `INSERT INTO lancamentos (descricao, valor, tipo, status, data, conta_id, categoria_id, parcela_id, origem)
       VALUES ($1,$2,'DESPESA','PAGO',$3,$4,$5,$6,'RECORRENTE')`,
      [`${p.divida.nome} · parcela ${p.parcela.numero}`, p.valor, p.data, p.conta_id, p.categoria_id ?? p.divida.categoria_id, p.parcela.id],
    )
  }
  await db.execute(
    `UPDATE dividas SET status = 'QUITADA' WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM parcelas WHERE divida_id = $1 AND pago_em IS NULL)`,
    [p.divida.id],
  )
}
