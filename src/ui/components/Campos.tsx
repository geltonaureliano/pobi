import type { ReactNode } from 'react'

export function Campo({ rotulo, erro, children, largo }: { rotulo: string; erro?: string; children: ReactNode; largo?: boolean }) {
  return (
    <label className="campo" style={largo ? { gridColumn: '1 / -1' } : undefined}>
      {rotulo}
      {children}
      {erro && <span className="erro">{erro}</span>}
    </label>
  )
}

export function Opcoes({ itens, vazio = '—' }: { itens: { id: number | string; nome: string }[]; vazio?: string | null }) {
  return (
    <>
      {vazio != null && <option value="">{vazio}</option>}
      {itens.map((i) => <option key={i.id} value={i.id}>{i.nome}</option>)}
    </>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="vazio">{children}</div>
}
