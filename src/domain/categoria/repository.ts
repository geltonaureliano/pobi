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
