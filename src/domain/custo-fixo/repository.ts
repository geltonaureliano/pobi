import { banco } from '../../db/client'
import type { CustoFixo, NovoCustoFixo } from './model'

export async function listarCustosFixos(): Promise<CustoFixo[]> {
  return (await banco()).select('SELECT * FROM custos_fixos ORDER BY ativo DESC, nome')
}
export async function criarCustoFixo(c: NovoCustoFixo) {
  const r = await (await banco()).execute(
    'INSERT INTO custos_fixos (nome, valor, dia_vencimento, inicio, fim, conta_id, cartao_id, categoria_id, observacao, origem) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
    [c.nome, c.valor, c.dia_vencimento, c.inicio, c.fim, c.conta_id, c.cartao_id, c.categoria_id, c.observacao, c.origem ?? 'MANUAL'])
  return r.lastInsertId
}
export async function atualizarCustoFixo(id: number, c: NovoCustoFixo) {
  await (await banco()).execute(
    'UPDATE custos_fixos SET nome=$2, valor=$3, dia_vencimento=$4, inicio=$5, fim=$6, conta_id=$7, cartao_id=$8, categoria_id=$9, observacao=$10 WHERE id=$1',
    [id, c.nome, c.valor, c.dia_vencimento, c.inicio, c.fim, c.conta_id, c.cartao_id, c.categoria_id, c.observacao])
}
export async function alternarCustoFixo(id: number, ativo: boolean) {
  await (await banco()).execute('UPDATE custos_fixos SET ativo = $2 WHERE id = $1', [id, ativo ? 1 : 0])
}
export async function excluirCustoFixo(id: number) {
  await (await banco()).execute('DELETE FROM custos_fixos WHERE id = $1', [id])
}
