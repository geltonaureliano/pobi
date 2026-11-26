/**
 * Acesso ao SQLite local. No app desktop usa o plugin SQL do Tauri
 * (arquivo financas.db na pasta de dados do app). Fora do Tauri (npm run dev
 * no navegador) usa sql.js em memória com a mesma migração, para desenvolver
 * a interface sem o app nativo.
 */
export interface Banco {
  select<T>(sql: string, params?: unknown[]): Promise<T[]>
  execute(sql: string, params?: unknown[]): Promise<{ lastInsertId?: number; rowsAffected: number }>
}

export const emTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

let instancia: Promise<Banco> | null = null

export function banco(): Promise<Banco> {
  instancia ??= emTauri() ? abrirTauri() : abrirNavegador()
  return instancia
}

async function abrirTauri(): Promise<Banco> {
  const { default: Database } = await import('@tauri-apps/plugin-sql')
  const db = await Database.load('sqlite:financas.db')
  await db.execute('PRAGMA foreign_keys = ON')
  return {
    select: (sql, params = []) => db.select(sql, params),
    execute: async (sql, params = []) => {
      const r = await db.execute(sql, params)
      return { lastInsertId: r.lastInsertId, rowsAffected: r.rowsAffected }
    },
  }
}

async function abrirNavegador(): Promise<Banco> {
  const [{ default: initSqlJs }, { default: wasmUrl }, { default: m1 }, { default: m2 }, { semearDemo }, { default: m3 }, { default: m4 }, { default: m5 }] = await Promise.all([
    import('sql.js'),
    import('sql.js/dist/sql-wasm.wasm?url'),
    import('../../src-tauri/migrations/001_init.sql?raw'),
    import('../../src-tauri/migrations/002_pagamento_fatura.sql?raw'),
    import('./demo'),
    import('../../src-tauri/migrations/003_detalhes.sql?raw'),
    import('../../src-tauri/migrations/004_conversas_ia.sql?raw'),
    import('../../src-tauri/migrations/005_receitas_por_hora.sql?raw'),
  ])
  const SQL = await initSqlJs({ locateFile: () => wasmUrl })
  const db = new SQL.Database()
  for (const m of [m1, m2, m3, m4, m5]) db.exec(m)
  const adaptar = (sql: string) => sql.replace(/\$(\d+)/g, '?$1')
  const b: Banco = {
    async select<T>(sql: string, params: unknown[] = []) {
      const st = db.prepare(adaptar(sql))
      st.bind(params as never)
      const rows: T[] = []
      while (st.step()) rows.push(st.getAsObject() as T)
      st.free()
      return rows
    },
    async execute(sql, params = []) {
      db.run(adaptar(sql), params as never)
      const id = db.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0] as number | undefined
      return { lastInsertId: id, rowsAffected: db.getRowsModified() }
    },
  }
  await semearDemo(b)
  return b
}
