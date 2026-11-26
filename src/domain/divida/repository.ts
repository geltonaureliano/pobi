import { banco } from '../../db/client'
import type { Centavos } from '../../shared/dinheiro'
import type { DataISO } from '../../shared/data'
import type { Divida, Parcela, SistemaAmortizacao, TipoDivida } from './model'
import { gerarParcelas, gerarParcelasFixas } from './rules'

export async function listarDividas(): Promise<Divida[]> {
  return (await banco()).select("SELECT * FROM dividas ORDER BY status = 'ATIVA' DESC, nome")
}

export async function listarParcelas(): Promise<Parcela[]> {
  return (await banco()).select('SELECT * FROM parcelas ORDER BY vencimento')
}

export interface DetalhesDivida {
  tipo: TipoDivida | null
  valor_contratado: Centavos | null
  taxa_anual: number | null
  cet_anual: number | null
  sistema: SistemaAmortizacao | null
  data_contratacao: DataISO | null
  observacao: string | null
}

export interface NovaDivida extends DetalhesDivida {
  nome: string
  credor: string | null
  /** Total a pagar. Ignorado quando `valorParcela` vem preenchido (total = parcela × N). */
  total: Centavos
  valorParcela?: Centavos | null
  parcelas: number
  /** Parcelas do início do contrato que já foram pagas antes de cadastrar. */
  parcelasPagas?: number
  primeiroVencimento: DataISO
  taxa_mensal: number | null
  categoria_id: number | null
  origem?: 'MANUAL' | 'IA'
}

export async function criarDivida(d: NovaDivida) {
  const db = await banco()
  const parcelas = d.valorParcela ? gerarParcelasFixas(d.valorParcela, d.parcelas, d.primeiroVencimento) : gerarParcelas(d.total, d.parcelas, d.primeiroVencimento)
  const total = parcelas.reduce((s, p) => s + p.valor, 0)
  const r = await db.execute(
    `INSERT INTO dividas (nome, credor, valor_total, taxa_mensal, categoria_id, tipo, valor_contratado, taxa_anual, cet_anual, sistema, data_contratacao, observacao, origem)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [d.nome, d.credor, total, d.taxa_mensal, d.categoria_id, d.tipo, d.valor_contratado, d.taxa_anual, d.cet_anual, d.sistema, d.data_contratacao, d.observacao, d.origem ?? 'MANUAL'],
  )
  const pagas = Math.min(d.parcelasPagas ?? 0, parcelas.length)
  for (const p of parcelas) {
    const paga = p.numero <= pagas
    await db.execute('INSERT INTO parcelas (divida_id, numero, valor, vencimento, pago_em, valor_pago) VALUES ($1,$2,$3,$4,$5,$6)', [
      r.lastInsertId, p.numero, p.valor, p.vencimento, paga ? p.vencimento : null, paga ? p.valor : null,
    ])
  }
  if (pagas === parcelas.length && pagas > 0) await db.execute("UPDATE dividas SET status = 'QUITADA' WHERE id = $1", [r.lastInsertId])
  return r.lastInsertId
}

/** Edita só os dados descritivos; parcelas já geradas não mudam. */
export async function atualizarDivida(id: number, d: { nome: string; credor: string | null; taxa_mensal: number | null; status: Divida['status'] } & DetalhesDivida) {
  await (await banco()).execute(
    `UPDATE dividas SET nome=$2, credor=$3, taxa_mensal=$4, status=$5, tipo=$6, valor_contratado=$7, taxa_anual=$8, cet_anual=$9, sistema=$10, data_contratacao=$11, observacao=$12 WHERE id=$1`,
    [id, d.nome, d.credor, d.taxa_mensal, d.status, d.tipo, d.valor_contratado, d.taxa_anual, d.cet_anual, d.sistema, d.data_contratacao, d.observacao],
  )
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
