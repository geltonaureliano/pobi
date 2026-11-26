import { banco } from '../../db/client'
import type { NovaReceita, Receita } from './model'

export async function listarReceitas(): Promise<Receita[]> {
  return (await banco()).select('SELECT * FROM receitas ORDER BY ativa DESC, nome')
}
export async function criarReceita(r: NovaReceita) {
  await (await banco()).execute(
    'INSERT INTO receitas (nome, valor, dia_recebimento, inicio, fim, conta_id, categoria_id, observacao) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [r.nome, r.valor, r.dia_recebimento, r.inicio, r.fim, r.conta_id, r.categoria_id, r.observacao])
}
export async function atualizarReceita(id: number, r: NovaReceita) {
  await (await banco()).execute(
    'UPDATE receitas SET nome=$2, valor=$3, dia_recebimento=$4, inicio=$5, fim=$6, conta_id=$7, categoria_id=$8, observacao=$9 WHERE id=$1',
    [id, r.nome, r.valor, r.dia_recebimento, r.inicio, r.fim, r.conta_id, r.categoria_id, r.observacao])
}
export async function alternarReceita(id: number, ativa: boolean) {
  await (await banco()).execute('UPDATE receitas SET ativa = $2 WHERE id = $1', [id, ativa ? 1 : 0])
}
export async function excluirReceita(id: number) {
  await (await banco()).execute('DELETE FROM receitas WHERE id = $1', [id])
}
