import { invoke } from '@tauri-apps/api/core'
import { banco, emTauri } from '../../db/client'
import type { Competencia } from '../../shared/data'
import type { AnaliseSalva, Motor, ResumoFinanceiro } from './model'

export interface MotorDisponivel {
  motor: Motor
  caminho: string | null
}

export async function motoresDisponiveis(): Promise<MotorDisponivel[]> {
  if (!emTauri()) return [{ motor: 'claude', caminho: null }, { motor: 'codex', caminho: null }]
  return invoke('motores_disponiveis')
}

export async function executarNoCLI(motor: Motor, prompt: string): Promise<string> {
  if (!emTauri()) throw new Error('As análises por IA só rodam no app desktop.')
  return invoke('executar_analise', { motor, prompt })
}

export async function listarAnalises(c: Competencia): Promise<AnaliseSalva[]> {
  return (await banco()).select('SELECT * FROM analises WHERE competencia = $1 ORDER BY criado_em DESC LIMIT 10', [c])
}

export async function buscarPorImpressao(imp: string, motor: Motor): Promise<AnaliseSalva | undefined> {
  const [a] = await (await banco()).select<AnaliseSalva>(
    'SELECT * FROM analises WHERE impressao = $1 AND motor = $2 ORDER BY criado_em DESC LIMIT 1',
    [imp, motor],
  )
  return a
}

export async function salvarAnalise(c: Competencia, motor: Motor, imp: string, resumo: ResumoFinanceiro, resultado: unknown) {
  await (await banco()).execute(
    'INSERT INTO analises (competencia, motor, impressao, resumo_json, resultado_json) VALUES ($1,$2,$3,$4,$5)',
    [c, motor, imp, JSON.stringify(resumo), JSON.stringify(resultado)],
  )
}

export async function lerAjuste(chave: string): Promise<string | undefined> {
  const [r] = await (await banco()).select<{ valor: string }>('SELECT valor FROM ajustes WHERE chave = $1', [chave])
  return r?.valor
}

export async function salvarAjuste(chave: string, valor: string) {
  await (await banco()).execute(
    'INSERT INTO ajustes (chave, valor) VALUES ($1,$2) ON CONFLICT (chave) DO UPDATE SET valor = excluded.valor',
    [chave, valor],
  )
}
