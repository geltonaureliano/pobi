import type { Banco } from './client'
import { competenciaDe, dataNoMes, deslocarCompetencia, hoje, intervaloDeDias } from '../shared/data'
import { gerarParcelas } from '../domain/divida/rules'
import { faturaDaCompra, marcaDePagamento, vencimentoDaFatura } from '../domain/cartao/rules'

/** Dados fictícios só para o modo navegador (desenvolvimento da interface). Nunca roda no app desktop. */
export async function semearDemo(db: Banco) {
  let s = 42
  const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
  const cats = Object.fromEntries(
    (await db.select<{ id: number; nome: string }>('SELECT id, nome FROM categorias')).map((c) => [c.nome, c.id]),
  )
  await db.execute(`INSERT INTO contas (nome, tipo, saldo_inicial, principal) VALUES ('Nubank','CORRENTE',350000,1),('Inter','CORRENTE',120000,0),('Reserva','INVESTIMENTO',1800000,0)`)
  await db.execute(`INSERT INTO cartoes (nome, limite, dia_fechamento, dia_vencimento, conta_pagamento_id) VALUES ('Nubank Roxinho', 1200000, 3, 10, 1)`)

  const fim = hoje()
  const inicio = `${deslocarCompetencia(competenciaDe(fim), -8)}-01`
  const ins = (d: string, desc: string, v: number, tipo: string, cat: string, conta: number | null, cartao: number | null = null) =>
    db.execute(
      'INSERT INTO lancamentos (descricao, valor, tipo, status, data, conta_id, cartao_id, categoria_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [desc, v, tipo, 'PAGO', d, conta, cartao, cats[cat]],
    )
  const variaveis: [string, string, number, number][] = [
    ['Mercado', 'Supermercado', 18000, 0.35], ['Restaurantes', 'iFood', 6500, 0.45], ['Transporte', 'Uber', 3200, 0.4],
    ['Lazer', 'Cinema', 9000, 0.08], ['Compras', 'Amazon', 15000, 0.1], ['Saúde', 'Farmácia', 7000, 0.1],
  ]
  for (const d of intervaloDeDias(inicio, fim)) {
    const dia = Number(d.slice(8))
    const c = competenciaDe(d)
    if (dia === 5) await ins(d, 'Salário', 1250000, 'RECEITA', 'Salário', 1)
    if (dia === 20 && rnd() < 0.6) await ins(d, 'Projeto freelance', 200000 + Math.round(rnd() * 300000), 'RECEITA', 'Freelance', 2)
    if (d === dataNoMes(c, 10)) {
      await ins(d, 'Aluguel', 280000, 'DESPESA', 'Moradia', 1)
      await ins(d, 'Internet', 12000, 'DESPESA', 'Contas da casa', 1)
      await ins(d, 'Energia', 18000 + Math.round(rnd() * 8000), 'DESPESA', 'Contas da casa', 1)
      await ins(d, 'Spotify', 2190, 'DESPESA', 'Assinaturas', null, 1)
      await ins(d, 'Netflix', 5590, 'DESPESA', 'Assinaturas', null, 1)
    }
    for (const [cat, desc, base, p] of variaveis) {
      if (rnd() >= p) continue
      const noCartao = rnd() < 0.5
      await ins(d, desc, Math.round(base * (0.4 + rnd() * 1.2)), 'DESPESA', cat, noCartao ? null : 1, noCartao ? 1 : null)
    }
  }
  // Faturas já vencidas são pagas pela conta principal no dia do vencimento.
  const cartao = { dia_fechamento: 3, dia_vencimento: 10 }
  const porFatura = new Map<string, number>()
  for (const l of await db.select<{ data: string; valor: number }>('SELECT data, valor FROM lancamentos WHERE cartao_id = 1')) {
    const f = faturaDaCompra(cartao, l.data)
    porFatura.set(f, (porFatura.get(f) ?? 0) + l.valor)
  }
  for (const [f, total] of porFatura) {
    const venc = vencimentoDaFatura(cartao, f)
    if (venc >= fim) continue
    await db.execute(
      "INSERT INTO lancamentos (descricao, valor, tipo, status, data, conta_id, fatura_ref) VALUES ($1,$2,'DESPESA','PAGO',$3,1,$4)",
      [`Fatura Nubank Roxinho ${f}`, total, venc, marcaDePagamento(1, f)],
    )
  }

  const atual = competenciaDe(fim)
  for (const [cat, lim] of [['Mercado', 220000], ['Restaurantes', 80000], ['Lazer', 50000], ['Transporte', 60000], ['Compras', 100000]] as const) {
    await db.execute('INSERT INTO orcamentos (categoria_id, competencia, limite) VALUES ($1,$2,$3)', [cats[cat], atual, lim])
  }
  await db.execute(`INSERT INTO receitas (nome, valor, dia_recebimento, inicio, conta_id, categoria_id) VALUES ('Salário', 1250000, 5, $1, 1, $2)`, [inicio, cats['Salário']])
  await db.execute(`INSERT INTO custos_fixos (nome, valor, dia_vencimento, inicio, conta_id, categoria_id) VALUES ('Aluguel', 280000, 10, $1, 1, $2), ('Internet', 12000, 10, $1, 1, $3)`, [inicio, cats['Moradia'], cats['Contas da casa']])
  const r = await db.execute(`INSERT INTO dividas (nome, credor, valor_total, taxa_mensal) VALUES ('Notebook', 'Loja', 840000, NULL)`)
  for (const p of gerarParcelas(840000, 12, `${deslocarCompetencia(atual, -4)}-15`)) {
    await db.execute('INSERT INTO parcelas (divida_id, numero, valor, vencimento, pago_em, valor_pago) VALUES ($1,$2,$3,$4,$5,$6)', [
      r.lastInsertId, p.numero, p.valor, p.vencimento, p.vencimento < fim ? p.vencimento : null, p.vencimento < fim ? p.valor : null,
    ])
  }
}
