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

export const NOME_MOTOR: Record<Motor, string> = { claude: 'Claude Code', codex: 'Codex' }

/** Traduz a falha do CLI em algo que dá para resolver. */
export function explicarErroIA(motor: Motor, msg: string): { tipo: 'login' | 'ausente' | 'outro'; texto: string } {
  const m = msg.toLowerCase()
  if (/not logged in|please run \/login|oauth|authenticat|unauthori[sz]ed|401|login required|not authenticated|expired/.test(m)) {
    return {
      tipo: 'login',
      texto: motor === 'claude'
        ? 'O Claude Code não está logado neste Mac. Abra o Terminal, rode `claude` e digite /login.'
        : 'O Codex não está logado. Abra o app do ChatGPT/Codex e entre na sua conta (ou rode `codex login`).',
    }
  }
  if (/não foi encontrado|not found|no such file/.test(m)) {
    return { tipo: 'ausente', texto: `O ${NOME_MOTOR[motor]} não foi encontrado neste Mac.` }
  }
  return { tipo: 'outro', texto: msg.replace(/^\w+ terminou com erro:\s*/, `${NOME_MOTOR[motor]} falhou: `) }
}

/**
 * Tenta o motor preferido e, se ele não estiver instalado ou logado, o outro.
 * Erros de conteúdo (resposta ruim, timeout) não trocam de motor.
 */
export async function comMotorDisponivel<T>(preferido: Motor, rodar: (m: Motor) => Promise<T>): Promise<{ valor: T; motor: Motor; aviso: string | null }> {
  const disponiveis = await motoresDisponiveis()
  const ordem: Motor[] = [preferido, preferido === 'claude' ? 'codex' : 'claude']
  const instalado = (m: Motor) => !emTauri() || disponiveis.some((d) => d.motor === m && d.caminho)
  const falhas: string[] = []
  for (const m of ordem) {
    if (!instalado(m)) { falhas.push(`O ${NOME_MOTOR[m]} não foi encontrado neste Mac.`); continue }
    try {
      const valor = await rodar(m)
      return { valor, motor: m, aviso: m !== preferido ? `${falhas.join(' ')} Usei o ${NOME_MOTOR[m]}.` : null }
    } catch (e) {
      const ex = explicarErroIA(m, e instanceof Error ? e.message : String(e))
      if (ex.tipo === 'outro') throw new Error(ex.texto)
      falhas.push(ex.texto)
    }
  }
  throw new Error(`${falhas.join(' ')} Instale ou faça login em um dos dois para usar a IA.`)
}
