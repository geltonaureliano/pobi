import { describe, expect, it, vi } from 'vitest'
vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))
import { comMotorDisponivel, explicarErroIA } from './repository'

describe('explicarErroIA', () => {
  it('login expirado do Claude vira instrução de login', () => {
    expect(explicarErroIA('claude', 'claude terminou com erro: Not logged in · Please run /login').tipo).toBe('login')
    expect(explicarErroIA('claude', 'Failed to authenticate: OAuth session expired').texto).toContain('/login')
  })
  it('outros erros mantêm a mensagem', () => {
    const r = explicarErroIA('codex', 'codex terminou com erro: rate limit')
    expect(r.tipo).toBe('outro')
    expect(r.texto).toBe('Codex falhou: rate limit')
  })
})

describe('comMotorDisponivel', () => {
  it('troca para o outro motor quando o preferido não está logado', async () => {
    const r = await comMotorDisponivel('claude', async (m) => {
      if (m === 'claude') throw new Error('claude terminou com erro: Not logged in')
      return 'ok'
    })
    expect(r).toMatchObject({ valor: 'ok', motor: 'codex' })
    expect(r.aviso).toContain('Usei o Codex')
  })
  it('erro de conteúdo não troca de motor', async () => {
    await expect(comMotorDisponivel('codex', async () => { throw new Error('codex terminou com erro: timeout') })).rejects.toThrow('Codex falhou: timeout')
  })
})
