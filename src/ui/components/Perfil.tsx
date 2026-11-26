import { useEffect, useMemo, useRef, useState } from 'react'
import { lerAjuste, salvarAjuste } from '../../domain/analise/repository'
import type { Dados } from '../useDados'
import { planoDoMes, saldoDoMes } from '../../domain/planejamento/rules'
import { competenciaDe, hoje } from '../../shared/data'
import { formatarBRL, formatarCompacto } from '../../shared/dinheiro'
import { toast } from '../toast'

const NOME_PADRAO = 'Gelton'

const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'

/** Rodapé da sidebar: clique no nome para editar. Mostra o saldo do mês até hoje (receitas − despesas). */
export function Perfil({ dados }: { dados: Dados | null }) {
  const [nome, setNome] = useState(NOME_PADRAO)
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const campo = useRef<HTMLInputElement>(null)

  useEffect(() => { lerAjuste('nome').then((n) => n && setNome(n)).catch(() => {}) }, [])
  useEffect(() => { if (editando) campo.current?.select() }, [editando])

  function abrir() { setRascunho(nome); setEditando(true) }
  async function salvar() {
    const novo = rascunho.trim()
    setEditando(false)
    if (!novo || novo === nome) return
    setNome(novo)
    await salvarAjuste('nome', novo)
    toast.sucesso('Nome atualizado', novo)
  }

  const plano = useMemo(() => (dados ? planoDoMes(dados, competenciaDe(hoje())) : null), [dados])
  const sd = plano ? saldoDoMes(plano, hoje()) : null
  const saldo = sd?.ateHoje ?? 0
  const titulo = sd ? `Saldo do mês até hoje (receitas − despesas): ${formatarBRL(sd.ateHoje)} · fecha o mês em ${formatarBRL(sd.fechamento)}` : undefined
  const subtitulo = sd ? `saldo ${formatarCompacto(sd.ateHoje)} · mês ${formatarCompacto(sd.fechamento)}` : '…'

  return (
    <div className={`sidebar-rodape perfil ${editando ? 'editando' : ''}`} onClick={editando ? undefined : abrir} title={editando ? undefined : 'Clique para alterar o nome'}>
      <div className="avatar">{iniciais(editando ? rascunho : nome)}</div>
      <div className="perfil-texto">
        {editando ? (
          <input
            ref={campo} className="perfil-campo" value={rascunho} maxLength={40} aria-label="Seu nome"
            onChange={(e) => setRascunho(e.target.value)} onBlur={salvar}
            onKeyDown={(e) => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') setEditando(false) }}
          />
        ) : (
          <span className="perfil-nome"><span>{nome}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10.5 2.5l3 3L6 13H3v-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg></span>
        )}
        <small className={saldo < 0 ? "negativo" : ""} title={titulo}>{subtitulo}</small>
      </div>
    </div>
  )
}
