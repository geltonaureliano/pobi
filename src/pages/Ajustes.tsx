import { useEffect, useState } from 'react'
import type { Motor } from '../domain/analise/model'
import { lerAjuste, motoresDisponiveis, salvarAjuste, type MotorDisponivel } from '../domain/analise/repository'
import { emTauri } from '../db/client'
import { toast } from '../ui/toast'

export function Ajustes() {
  const [motores, setMotores] = useState<MotorDisponivel[]>([])
  const [motor, setMotor] = useState<Motor>('claude')
  useEffect(() => {
    motoresDisponiveis().then(setMotores)
    lerAjuste('motor').then((m) => m && setMotor(m as Motor))
  }, [])
  return (
    <>
      <div className="topo"><h1>Ajustes</h1></div>
      <div className="secao">
        <div className="secao-topo"><h3>Motor de análise</h3></div>
        {motores.map((m) => (
          <div className="item-lista" key={m.motor}>
            <div>
              <strong>{m.motor === 'claude' ? 'Claude Code' : 'Codex'}</strong>
              <div className="sutil">{m.caminho ?? (emTauri() ? 'não encontrado neste computador' : 'verificado só no app desktop')}</div>
            </div>
            <button className={`aba ${motor === m.motor ? 'ativa' : ''}`} onClick={async () => { await salvarAjuste('motor', m.motor); setMotor(m.motor); toast.sucesso(`Usando o ${m.motor === 'claude' ? 'Claude Code' : 'Codex'} nas análises`) }}>
              {motor === m.motor ? 'em uso' : 'usar'}
            </button>
          </div>
        ))}
      </div>
      <div className="secao">
        <div className="secao-topo"><h3>Banco de dados</h3></div>
        <p className="sutil">Arquivo SQLite local <code>financas.db</code>, na pasta de dados do app (no Mac: ~/Library/Application Support/com.gelton.pobi). Nada sai do computador, exceto o resumo agregado enviado ao CLI quando você pede uma análise.</p>
      </div>
    </>
  )
}
