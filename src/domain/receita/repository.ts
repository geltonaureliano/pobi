import { banco } from '../../db/client'
import type { AjusteReceitaMes, NovaReceita, Receita } from './model'

export async function listarReceitas(): Promise<Receita[]> {
  return (await banco()).select('SELECT * FROM receitas ORDER BY ativa DESC, nome')
}
export async function criarReceita(r: NovaReceita) {
  const res = await (await banco()).execute(
    `INSERT INTO receitas (nome, valor, dia_recebimento, inicio, fim, conta_id, categoria_id, observacao, tipo_valor, valor_min, valor_max, fonte, origem,
       regra, valor_hora, horas_dia, desconto_pct, defasagem_meses)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [r.nome, r.valor, r.dia_recebimento, r.inicio, r.fim, r.conta_id, r.categoria_id, r.observacao, r.tipo_valor, r.valor_min, r.valor_max, r.fonte, r.origem ?? 'MANUAL',
      r.regra ?? r.tipo_valor, r.valor_hora ?? null, r.horas_dia ?? null, r.desconto_pct ?? null, r.defasagem_meses ?? 1])
  return res.lastInsertId
}
export async function atualizarReceita(id: number, r: NovaReceita) {
  await (await banco()).execute(
    `UPDATE receitas SET nome=$2, valor=$3, dia_recebimento=$4, inicio=$5, fim=$6, conta_id=$7, categoria_id=$8, observacao=$9,
     tipo_valor=$10, valor_min=$11, valor_max=$12, fonte=$13, regra=$14, valor_hora=$15, horas_dia=$16, desconto_pct=$17, defasagem_meses=$18 WHERE id=$1`,
    [id, r.nome, r.valor, r.dia_recebimento, r.inicio, r.fim, r.conta_id, r.categoria_id, r.observacao, r.tipo_valor, r.valor_min, r.valor_max, r.fonte,
      r.regra ?? r.tipo_valor, r.valor_hora ?? null, r.horas_dia ?? null, r.desconto_pct ?? null, r.defasagem_meses ?? 1])
}
export async function alternarReceita(id: number, ativa: boolean) {
  await (await banco()).execute('UPDATE receitas SET ativa = $2 WHERE id = $1', [id, ativa ? 1 : 0])
}
export async function excluirReceita(id: number) {
  await (await banco()).execute('DELETE FROM receitas WHERE id = $1', [id])
}

export async function listarAjustesReceitas(): Promise<AjusteReceitaMes[]> {
  return (await banco()).select('SELECT * FROM receitas_mes')
}
/** Grava o ajuste do mês; sem dias nem valor, remove o ajuste. */
export async function salvarAjusteReceita(a: AjusteReceitaMes) {
  const db = await banco()
  if (a.dias == null && a.valor == null) {
    await db.execute('DELETE FROM receitas_mes WHERE receita_id = $1 AND competencia = $2', [a.receita_id, a.competencia])
    return
  }
  await db.execute(
    `INSERT INTO receitas_mes (receita_id, competencia, dias, valor, observacao) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (receita_id, competencia) DO UPDATE SET dias = excluded.dias, valor = excluded.valor, observacao = excluded.observacao`,
    [a.receita_id, a.competencia, a.dias, a.valor, a.observacao],
  )
}
