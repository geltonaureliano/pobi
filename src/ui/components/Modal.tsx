import { useEffect, useState, type ReactNode } from 'react'

export function Modal({ titulo, aberto, fechar, children, rodape, largura = 620 }: {
  titulo: string; aberto: boolean; fechar: () => void; children: ReactNode; rodape?: ReactNode; largura?: number
}) {
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, fechar])
  if (!aberto) return null
  return (
    <div className="modal-fundo" onMouseDown={fechar}>
      <div className="modal" style={{ maxWidth: largura }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-topo"><h3>{titulo}</h3><button className="aba" onClick={fechar}>fechar</button></div>
        <div className="modal-corpo">{children}</div>
        {rodape && <div className="modal-rodape">{rodape}</div>}
      </div>
    </div>
  )
}

/** Botão de excluir que pede confirmação no segundo clique. */
export function BotaoExcluir({ onConfirmar, rotulo = 'excluir' }: { onConfirmar: () => void | Promise<void>; rotulo?: string }) {
  const [confirmando, setConfirmando] = useState(false)
  useEffect(() => {
    if (!confirmando) return
    const t = setTimeout(() => setConfirmando(false), 3000)
    return () => clearTimeout(t)
  }, [confirmando])
  return (
    <button className={`aba ${confirmando ? 'perigo' : ''}`} onClick={() => (confirmando ? onConfirmar() : setConfirmando(true))}>
      {confirmando ? 'confirmar?' : rotulo}
    </button>
  )
}
