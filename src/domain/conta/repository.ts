import { banco } from '../../db/client'
import type { Conta, NovaConta } from './model'

export async function listarContas(): Promise<Conta[]> {
  return (await banco()).select('SELECT * FROM contas ORDER BY principal DESC, nome')
}

export async function criarConta(c: NovaConta) {
  const db = await banco()
  const [{ n }] = await db.select<{ n: number }>('SELECT COUNT(*) AS n FROM contas')
  const r = await db.execute('INSERT INTO contas (nome, tipo, saldo_inicial, principal) VALUES ($1,$2,$3,$4)', [
    c.nome, c.tipo, c.saldo_inicial, n === 0 ? 1 : 0,
  ])
  return r.lastInsertId
}

/** Só uma conta pode ser a principal. */
export async function definirPrincipal(id: number) {
  const db = await banco()
  await db.execute('UPDATE contas SET principal = CASE WHEN id = $1 THEN 1 ELSE 0 END', [id])
}

export async function arquivarConta(id: number, arquivada: boolean) {
  await (await banco()).execute('UPDATE contas SET arquivada = $2 WHERE id = $1', [id, arquivada ? 1 : 0])
}
