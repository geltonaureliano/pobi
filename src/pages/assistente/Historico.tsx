import { useEffect, useState } from 'react'
import type { AlvoAssistente, ConversaIA } from '../../domain/assistente/model'
import { excluirConversa, listarConversas } from '../../domain/assistente/repository'
import { quandoLegivel } from '../../domain/assistente/rules'
import { BotaoExcluir } from '../../ui/components/Modal'
import { Simbolo } from '../../ui/components/Marca'
import { toast } from '../../ui/toast'

/** Gaveta lateral com as conversas do assistente: rascunhos para continuar e cadastros já feitos. */
export function HistoricoConversas({ alvo, aberto, fechar, abrir, nova, atual, versao = 0 }: {
  alvo: AlvoAssistente; aberto: boolean; fechar: () => void; abrir: (id: string) => void; nova: () => void; atual?: string; versao?: number
}) {
  const [conversas, setConversas] = useState<ConversaIA[] | null>(null)
  const [filtro, setFiltro] = useState<'RASCUNHO' | 'TODAS'>('RASCUNHO')
  const [saindo, setSaindo] = useState(false)

  useEffect(() => { if (aberto) listarConversas(alvo).then(setConversas).catch(() => setConversas([])) }, [aberto, alvo, versao])
  useEffect(() => {
    if (!aberto) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && sair()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  })
  function sair() { setSaindo(true); setTimeout(() => { setSaindo(false); fechar() }, 180) }

  if (!aberto) return null
  const rascunhos = conversas?.filter((c) => c.status === 'RASCUNHO') ?? []
  const lista = filtro === 'RASCUNHO' ? rascunhos : conversas ?? []
  const item = alvo === 'divida' ? 'dívida' : 'receita'

  return (
    <div className={`gaveta-fundo ${saindo ? 'saindo' : ''}`} onMouseDown={sair}>
      <aside className="gaveta" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Conversas com a IA">
        <header className="gaveta-topo">
          <div>
            <h3>Conversas com a IA</h3>
            <span className="sutil">Tudo é salvo a cada mensagem. O que não foi confirmado fica como rascunho.</span>
          </div>
          <button className="botao-icone" onClick={sair} aria-label="Fechar">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="gaveta-acoes">
          <div className="motores">
            <button className={filtro === 'RASCUNHO' ? 'on' : ''} onClick={() => setFiltro('RASCUNHO')}>Rascunhos {rascunhos.length > 0 && <b className="contador">{rascunhos.length}</b>}</button>
            <button className={filtro === 'TODAS' ? 'on' : ''} onClick={() => setFiltro('TODAS')}>Todas</button>
          </div>
          <button className="botao" onClick={() => { nova(); sair() }}>+ Nova conversa</button>
        </div>
        <div className="gaveta-lista">
          {conversas == null && <><i className="esqueleto conversa-esqueleto" /><i className="esqueleto conversa-esqueleto" /></>}
          {conversas != null && !lista.length && (
            <div className="gaveta-vazia">
              <Simbolo tamanho={34} />
              <strong>{filtro === 'RASCUNHO' ? 'Nenhum rascunho' : 'Nenhuma conversa ainda'}</strong>
              <span>Quando você começa a cadastrar uma {item} com a IA, a conversa aparece aqui.</span>
            </div>
          )}
          {lista.map((c) => {
            const ultima = [...c.mensagens].reverse().find((m) => !m.erro)
            return (
              <div key={c.id} className={`conversa ${c.id === atual ? 'atual' : ''}`}>
                <button className="conversa-abrir" onClick={() => { abrir(c.id); sair() }}>
                  <span className={`conversa-icone ${c.status === 'CONCLUIDA' ? 'ok' : ''}`}>
                    {c.status === 'CONCLUIDA'
                      ? <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      : <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>}
                  </span>
                  <span className="conversa-texto">
                    <strong>{c.titulo}</strong>
                    <small>{ultima ? `${ultima.autor === 'ia' ? 'IA: ' : ''}${ultima.texto || ultima.anexos.map((a) => a.nome).join(', ')}` : 'Sem mensagens ainda'}</small>
                    <span className="conversa-meta">
                      <span className={`tag ${c.status === 'CONCLUIDA' ? 'bom' : 'laranja'}`}>{c.status === 'CONCLUIDA' ? 'cadastrada' : 'rascunho'}</span>
                      <span>{c.mensagens.length} {c.mensagens.length === 1 ? 'mensagem' : 'mensagens'}</span>
                      <span>{quandoLegivel(c.atualizado_em)}</span>
                    </span>
                  </span>
                </button>
                <BotaoExcluir icone rotulo={`Excluir conversa ${c.titulo}`} onConfirmar={async () => {
                  await excluirConversa(c.id)
                  toast.info('Conversa excluída', c.titulo)
                  setConversas((x) => x?.filter((y) => y.id !== c.id) ?? null)
                }} />
              </div>
            )
          })}
        </div>
      </aside>
    </div>
  )
}

/** Botão "Conversas" com contador de rascunhos. */
export function BotaoConversas({ alvo, onClick, versao = 0 }: { alvo: AlvoAssistente; onClick: () => void; versao?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => { listarConversas(alvo).then((c) => setN(c.filter((x) => x.status === 'RASCUNHO').length)).catch(() => {}) }, [alvo, versao])
  return (
    <button className="botao secundario botao-conversas" onClick={onClick} title="Conversas e rascunhos com a IA">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
      Conversas
      {n > 0 && <b className="contador">{n}</b>}
    </button>
  )
}
