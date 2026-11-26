import { useEffect, useState } from 'react'
import { toast } from '../toast'

const noTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

/**
 * Barra de título da janela. Os botões do macOS (fechar, minimizar, tela cheia) ficam
 * sobrepostos à esquerda. A área vazia arrasta a janela e o duplo clique maximiza.
 */
export function BarraTitulo({ recarregar }: { recarregar: () => Promise<void> | void }) {
  const [versao, setVersao] = useState<string>(__APP_VERSION__)
  const [girando, setGirando] = useState(false)

  useEffect(() => {
    if (!noTauri) return
    import('@tauri-apps/api/app').then(({ getVersion }) => getVersion()).then(setVersao).catch(() => {})
  }, [])

  async function atualizar() {
    setGirando(true)
    try { await recarregar(); toast.info('Dados atualizados') } finally { setTimeout(() => setGirando(false), 400) }
  }

  return (
    <header className="barra-titulo" data-tauri-drag-region>
      <div className="barra-titulo-acoes">
        <button className={`barra-titulo-botao ${girando ? 'girando' : ''}`} onClick={atualizar} title="Recarregar dados do banco">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M12.6 1.6v3.1H9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className="barra-titulo-versao" data-tauri-drag-region>v{versao}</span>
      </div>
    </header>
  )
}
