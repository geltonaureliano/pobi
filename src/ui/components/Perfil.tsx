import { useMemo } from 'react'
import type { Dados } from '../useDados'
import { planoDoMes, saldoDoMes } from '../../domain/planejamento/rules'
import { competenciaDe, hoje } from '../../shared/data'
import { formatarBRL, formatarCompacto } from '../../shared/dinheiro'
import { usePerfil } from '../perfil'
import { Avatar } from './Avatar'

/** Rodapé da sidebar: nome, avatar e saldo do mês até hoje. Clicar abre Ajustes › Perfil. */
export function Perfil({ dados, abrir, ativo }: { dados: Dados | null; abrir: () => void; ativo?: boolean }) {
  const perfil = usePerfil()
  const plano = useMemo(() => (dados ? planoDoMes(dados, competenciaDe(hoje())) : null), [dados])
  const sd = plano ? saldoDoMes(plano, hoje()) : null
  const titulo = sd ? `Saldo do mês até hoje (receitas − despesas): ${formatarBRL(sd.ateHoje)} · fecha o mês em ${formatarBRL(sd.fechamento)}` : undefined

  return (
    <button className={`sidebar-rodape perfil ${ativo ? 'ativo' : ''}`} onClick={abrir} title="Seu perfil e ajustes">
      <Avatar perfil={perfil} />
      <span className="perfil-texto">
        <span className="perfil-nome"><span>{perfil.nome}</span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5l4.5 4.5L6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        <small className={(sd?.ateHoje ?? 0) < 0 ? 'negativo' : ''} title={titulo}>{sd ? `saldo ${formatarCompacto(sd.ateHoje)} · mês ${formatarCompacto(sd.fechamento)}` : '…'}</small>
      </span>
    </button>
  )
}
