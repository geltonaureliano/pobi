import { banco } from '../../db/client'
import type { Categoria, TipoCategoria } from './model'

export async function listarCategorias(tipo?: TipoCategoria): Promise<Categoria[]> {
  const db = await banco()
  return tipo
    ? db.select('SELECT * FROM categorias WHERE tipo = $1 ORDER BY nome', [tipo])
    : db.select('SELECT * FROM categorias ORDER BY tipo, nome')
}

export async function criarCategoria(nome: string, tipo: TipoCategoria, essencial: boolean) {
  const r = await (await banco()).execute('INSERT INTO categorias (nome, tipo, essencial) VALUES ($1,$2,$3)', [
    nome.trim(), tipo, essencial ? 1 : 0,
  ])
  return r.lastInsertId
}

export async function atualizarCategoria(id: number, nome: string, essencial: boolean, cor: string | null) {
  await (await banco()).execute('UPDATE categorias SET nome = $2, essencial = $3, cor = $4 WHERE id = $1', [id, nome.trim(), essencial ? 1 : 0, cor])
}

/** Categoria em uso não é excluída; os lançamentos ficariam sem categoria sem o usuário perceber. */
export async function excluirCategoria(id: number): Promise<'excluida' | 'em-uso'> {
  const db = await banco()
  const [{ n }] = await db.select<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM lancamentos WHERE categoria_id = $1) + (SELECT COUNT(*) FROM orcamentos WHERE categoria_id = $1)
     + (SELECT COUNT(*) FROM receitas WHERE categoria_id = $1) + (SELECT COUNT(*) FROM custos_fixos WHERE categoria_id = $1) AS n`, [id])
  if (n > 0) return 'em-uso'
  await db.execute('DELETE FROM categorias WHERE id = $1', [id])
  return 'excluida'
}

export async function usoDasCategorias(): Promise<{ categoria_id: number; n: number }[]> {
  return (await banco()).select('SELECT categoria_id, COUNT(*) AS n FROM lancamentos WHERE categoria_id IS NOT NULL GROUP BY categoria_id')
}
