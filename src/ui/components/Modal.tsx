import { useEffect, useRef, useState, type ReactNode } from 'react'

const SAIDA_MS = 180

export function Modal({ titulo, aberto, fechar, children, rodape, largura = 620 }: {
  titulo: string; aberto: boolean; fechar: () => void; children: ReactNode; rodape?: ReactNode; largura?: number
}) {
  // Mantém o modal montado durante a animação de saída, com o último conteúdo visível.
  const [montado, setMontado] = useState(aberto)
  const ultimo = useRef({ titulo, children, rodape })
  if (aberto) ultimo.current = { titulo, children, rodape }

  useEffect(() => {
    if (aberto) { setMontado(true); return }
    const t = setTimeout(() => setMontado(false), SAIDA_MS)
    return () => clearTimeout(t)
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [aberto, fechar])

  if (!aberto && !montado) return null
  const c = ultimo.current
  return (
    <div className={`modal-fundo ${aberto ? '' : 'saindo'}`} onMouseDown={aberto ? fechar : undefined}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={c.titulo} style={{ maxWidth: largura }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-topo">
          <h3>{c.titulo}</h3>
          <button className="botao-icone" onClick={fechar} aria-label="Fechar" title="Fechar (Esc)"><IconeFechar /></button>
        </div>
        <div className="modal-corpo">{c.children}</div>
        {c.rodape && <div className="modal-rodape">{c.rodape}</div>}
      </div>
    </div>
  )
}

const IconeFechar = () => (<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>)
export const IconeEditar = () => (<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>)
const IconeLixo = () => (<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)

/** Botão de excluir que pede confirmação no segundo clique. `icone` mostra só a lixeira. */
export function BotaoExcluir({ onConfirmar, rotulo = 'excluir', icone }: { onConfirmar: () => void | Promise<void>; rotulo?: string; icone?: boolean }) {
  const [confirmando, setConfirmando] = useState(false)
  useEffect(() => {
    if (!confirmando) return
    const t = setTimeout(() => setConfirmando(false), 3000)
    return () => clearTimeout(t)
  }, [confirmando])
  const agir = () => (confirmando ? onConfirmar() : setConfirmando(true))
  if (icone) {
    return (
      <button className={`botao-icone perigo ${confirmando ? 'confirmando' : ''}`} onClick={agir} aria-label={confirmando ? 'Confirmar exclusão' : rotulo} title={confirmando ? 'Clique de novo para confirmar' : rotulo}>
        {confirmando ? <span>confirmar?</span> : <IconeLixo />}
      </button>
    )
  }
  return (
    <button className={`aba ${confirmando ? 'perigo' : ''}`} onClick={agir}>
      {confirmando ? 'confirmar?' : rotulo}
    </button>
  )
}
