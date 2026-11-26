import { useEffect, useState } from 'react'
import { competenciaDe, hoje, rotuloCompetencia } from '../shared/data'
import { emTauri } from '../db/client'
import type { Motor, ResultadoAnalise } from '../domain/analise/model'
import { impressao, interpretarResposta, montarPrompt, montarResumo } from '../domain/analise/rules'
import { buscarPorImpressao, executarNoCLI, lerAjuste, listarAnalises, salvarAnalise } from '../domain/analise/repository'
import { listarOrcamentos } from '../domain/orcamento/repository'
import type { Dados } from '../ui/useDados'

export function Analises({ dados }: { dados: Dados }) {
  const c = competenciaDe(hoje())
  const [motor, setMotor] = useState<Motor>('claude')
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null)
  const [quando, setQuando] = useState<string | null>(null)
  const [status, setStatus] = useState<'parado' | 'rodando'>('parado')
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    lerAjuste('motor').then((m) => m && setMotor(m as Motor))
    listarAnalises(c).then(([a]) => { if (a) { setResultado(JSON.parse(a.resultado_json)); setQuando(a.criado_em) } })
  }, [c])

  async function analisar(forcar = false) {
    setErro(null); setStatus('rodando')
    try {
      const resumo = montarResumo({ ...dados, competencia: c, hoje: hoje(), orcamentos: await listarOrcamentos(c) })
      const imp = await impressao(resumo)
      const salva = forcar ? undefined : await buscarPorImpressao(imp, motor)
      if (salva) {
        setResultado(JSON.parse(salva.resultado_json)); setQuando(salva.criado_em)
      } else {
        const r = interpretarResposta(await executarNoCLI(motor, montarPrompt(resumo)))
        await salvarAnalise(c, motor, imp, resumo, r)
        setResultado(r); setQuando('agora')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setStatus('parado')
    }
  }

  return (
    <>
      <div className="topo">
        <h1>Análises · {rotuloCompetencia(c)}</h1>
        <div className="abas">
          <button className="botao secundario" disabled={status === 'rodando'} onClick={() => analisar(true)}>Refazer</button>
          <button className="botao laranja" disabled={status === 'rodando'} onClick={() => analisar()}>
            {status === 'rodando' ? `Analisando com ${motor}…` : 'Analisar mês'}
          </button>
        </div>
      </div>
      <div className="secao">
        {!emTauri() && <div className="aviso">Modo navegador: as análises rodam só no app desktop, que chama o CLI do Claude Code ou do Codex.</div>}
        {erro && <div className="aviso">{erro}</div>}
        {!resultado && !erro && <p className="sutil">Nenhuma análise deste mês ainda. Só totais agregados são enviados à IA, nunca o extrato completo.</p>}
        {resultado && (
          <>
            <h2 style={{ fontSize: 18, fontWeight: 500, margin: '0 0 6px' }}>{resultado.manchete}</h2>
            <p className="sutil" style={{ lineHeight: 1.6 }}>{resultado.resumo} {quando && `· ${quando}`}</p>
          </>
        )}
      </div>
      {resultado && (
        <div className="dupla">
          <div className="secao">
            <div className="secao-topo"><h3>Insights</h3></div>
            {resultado.insights.map((i, k) => (
              <div key={k} className={`insight ${i.severidade}`}><strong>{i.titulo}</strong><p>{i.detalhe}</p>{i.evidencia && <p>↳ {i.evidencia}</p>}</div>
            ))}
          </div>
          <div className="secao">
            <div className="secao-topo"><h3>Plano</h3></div>
            {resultado.plano.map((p, k) => (
              <div key={k} className="item-lista" style={{ display: 'block' }}><strong>{p.acao}</strong> <span className="sutil">· {p.prazo === 'semana' ? 'esta semana' : 'este mês'}</span><p className="sutil" style={{ margin: '6px 0 0' }}>{p.porque}</p></div>
            ))}
            {resultado.pontosCegos.length > 0 && (
              <>
                <div className="secao-topo" style={{ marginTop: 24 }}><h3>Pontos cegos</h3></div>
                {resultado.pontosCegos.map((p, k) => <p key={k} className="sutil">• {p}</p>)}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
