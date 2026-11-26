import { useEffect, useRef, useState } from 'react'
import { toast, type Toast } from '../toast'

const ICONES = {
  sucesso: <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  erro: <path d="M5 5l6 6M11 5l-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />,
  aviso: <><path d="M8 4.5v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="8" cy="11.8" r="1.1" fill="currentColor" /></>,
  info: <><circle cx="8" cy="4.6" r="1.1" fill="currentColor" /><path d="M8 7.5v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></>,
}

/** Pilha de toasts no canto inferior direito. Some sozinho; o mouse em cima pausa. */
export function Toaster() {
  const [lista, setLista] = useState<Toast[]>([])
  useEffect(() => toast.ouvir(setLista), [])
  return (
    <div className="toaster" role="region" aria-label="Avisos" aria-live="polite">
      {lista.map((t) => <ItemToast key={t.id} t={t} />)}
    </div>
  )
}

function ItemToast({ t }: { t: Toast }) {
  const [saindo, setSaindo] = useState(false)
  const [pausado, setPausado] = useState(false)
  const restante = useRef(t.duracao)
  const inicio = useRef(0)

  useEffect(() => {
    if (pausado || saindo) return
    inicio.current = Date.now()
    const id = setTimeout(() => setSaindo(true), restante.current)
    return () => { clearTimeout(id); restante.current -= Date.now() - inicio.current }
  }, [pausado, saindo])
  useEffect(() => {
    if (!saindo) return
    const id = setTimeout(() => toast.fechar(t.id), 220)
    return () => clearTimeout(id)
  }, [saindo, t.id])

  return (
    <div className={`toast ${t.tipo} ${saindo ? 'saindo' : ''} ${pausado ? 'pausado' : ''}`} role={t.tipo === 'erro' ? 'alert' : 'status'}
      onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)}>
      <span className="toast-icone"><svg viewBox="0 0 16 16" aria-hidden="true">{ICONES[t.tipo]}</svg></span>
      <div className="toast-texto">
        <strong>{t.texto}</strong>
        {t.detalhe && <span>{t.detalhe}</span>}
      </div>
      <button className="toast-fechar" onClick={() => setSaindo(true)} aria-label="Fechar aviso">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 4.5l7 7M11.5 4.5l-7 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      <i className="toast-tempo" style={{ animationDuration: `${t.duracao}ms` }} />
    </div>
  )
}
