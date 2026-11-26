import { useEffect, useMemo, useState } from 'react'
import { competenciaDe, hoje, rotuloCompetencia, rotuloMes } from '../shared/data'
import { formatarPct } from '../shared/dinheiro'
import { emTauri } from '../db/client'
import type { AnaliseSalva, Motor, ResultadoAnalise, ResumoFinanceiro, Severidade } from '../domain/analise/model'
import { impressao, interpretarResposta, montarPrompt, montarResumo } from '../domain/analise/rules'
import { buscarPorImpressao, comMotorDisponivel, executarNoCLI, lerAjuste, listarAnalises, NOME_MOTOR, salvarAnalise } from '../domain/analise/repository'
import { quandoLegivel } from '../domain/assistente/rules'
import { listarOrcamentos } from '../domain/orcamento/repository'
import { LinhaValores } from '../ui/components/Graficos'
import { Dinheiro } from '../ui/components/Dinheiro'
import { Simbolo } from '../ui/components/Marca'
import { toast } from '../ui/toast'
import type { Dados } from '../ui/useDados'

const ICONE: Record<Severidade, string> = { atencao: '!', oportunidade: '↗', positivo: '✓' }
const ROTULO: Record<Severidade, string> = { atencao: 'Atenção', oportunidade: 'Oportunidade', positivo: 'Ponto positivo' }
const ETAPAS = ['Montando o resumo do mês…', 'Enviando só os totais para a IA local…', 'Lendo receitas, despesas e projeção…', 'Escrevendo insights e plano…']
const centavos = (reais: number) => Math.round(reais * 100)

/** Radar IA: análise do mês feita pelo Claude Code ou Codex local, a partir de totais agregados. */
export function Analises({ dados }: { dados: Dados }) {
  const c = competenciaDe(hoje())
  const [motor, setMotor] = useState<Motor>('claude')
  const [historico, setHistorico] = useState<AnaliseSalva[]>([])
  const [atual, setAtual] = useState<{ resultado: ResultadoAnalise; resumo: ResumoFinanceiro | null; quando: string; motor: string } | null>(null)
  const [status, setStatus] = useState<'parado' | 'rodando'>('parado')
  const [etapa, setEtapa] = useState(0)
  const [erro, setErro] = useState<string | null>(null)
  const [feitos, setFeitos] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem('pobi.radar.feitos') ?? '{}') } catch { return {} } })
  const [verDados, setVerDados] = useState(false)

  const carregarHistorico = () => listarAnalises(c).then((h) => {
    setHistorico(h)
    if (h[0] && !atual) abrir(h[0])
  }).catch(() => {})
  useEffect(() => {
    lerAjuste('motor').then((m) => m && setMotor(m as Motor)).catch(() => {})
    carregarHistorico()
  }, [c]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (status !== 'rodando') return
    setEtapa(0)
    const t = setInterval(() => setEtapa((e) => Math.min(e + 1, ETAPAS.length - 1)), 3500)
    return () => clearInterval(t)
  }, [status])
  useEffect(() => { try { localStorage.setItem('pobi.radar.feitos', JSON.stringify(feitos)) } catch { /* sem armazenamento */ } }, [feitos])

  function abrir(a: AnaliseSalva) {
    setAtual({ resultado: JSON.parse(a.resultado_json), resumo: JSON.parse(a.resumo_json), quando: a.criado_em, motor: a.motor })
  }

  async function analisar(forcar = false) {
    setErro(null); setStatus('rodando')
    try {
      const resumo = montarResumo({ ...dados, competencia: c, hoje: hoje(), orcamentos: await listarOrcamentos(c) })
      const imp = await impressao(resumo)
      const salva = forcar ? undefined : await buscarPorImpressao(imp, motor)
      if (salva) {
        abrir(salva)
        toast.info('Nada mudou desde a última análise', 'Mostrando a análise salva. Use "Refazer" para gerar outra.')
      } else {
        const exec = await comMotorDisponivel(motor, (m) => executarNoCLI(m, montarPrompt(resumo)))
        const r = interpretarResposta(exec.valor)
        await salvarAnalise(c, exec.motor, imp, resumo, r)
        if (exec.aviso) toast.aviso(exec.aviso)
        setAtual({ resultado: r, resumo, quando: new Date().toISOString(), motor: exec.motor })
        toast.sucesso('Análise pronta')
        carregarHistorico()
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setStatus('parado')
    }
  }

  const r = atual?.resultado
  const p = atual?.resumo?.plano
  const contagem = useMemo(() => {
    const ins = r?.insights ?? []
    return { atencao: ins.filter((i) => i.severidade === 'atencao').length, oportunidade: ins.filter((i) => i.severidade === 'oportunidade').length, positivo: ins.filter((i) => i.severidade === 'positivo').length }
  }, [r])
  const chave = (i: number) => `${atual?.quando}:${i}`

  return (
    <>
      <div className="topo">
        <h1>Radar IA · {rotuloCompetencia(c)}</h1>
        <div className="acoes">
          <span className="motor-selo"><i />{NOME_MOTOR[motor]} · local</span>
          {r && <button className="botao secundario" disabled={status === 'rodando'} onClick={() => analisar(true)}>Refazer</button>}
          <button className="botao laranja" disabled={status === 'rodando'} onClick={() => analisar()}>{status === 'rodando' ? 'Analisando…' : r ? 'Analisar de novo' : 'Analisar mês'}</button>
        </div>
      </div>

      {!emTauri() && <div className="secao"><div className="aviso">Modo navegador: a análise roda só no app desktop, que chama o Claude Code ou o Codex do seu Mac.</div></div>}
      {erro && <div className="secao"><div className="aviso">{erro}</div></div>}

      {status === 'rodando' && (
        <div className="secao radar-rodando">
          <span className="msg-avatar pulsando"><Simbolo tamanho={22} /></span>
          <div><strong>{ETAPAS[etapa]}</strong><span className="sutil">Só totais agregados vão para a IA, nunca o extrato linha a linha.</span></div>
          <span className="pontos"><i /><i /><i /></span>
        </div>
      )}

      {!r && status !== 'rodando' && (
        <div className="secao radar-vazio">
          <div className="chat-vazio-icone"><Simbolo tamanho={44} /></div>
          <h2>O que a IA vê no seu mês?</h2>
          <p>Ela recebe suas receitas previstas, custos fixos, faturas, parcelas e a projeção dos próximos 6 meses, e devolve o que merece atenção, oportunidades e um plano curto.</p>
          <button className="botao laranja" onClick={() => analisar()}>Analisar {rotuloCompetencia(c).toLowerCase()}</button>
        </div>
      )}

      {r && (
        <>
          <div className="secao radar-manchete">
            <div className="radar-manchete-topo">
              <span className="sutil">{NOME_MOTOR[(atual?.motor as Motor) ?? motor] ?? atual?.motor} · {quandoLegivel(atual!.quando)}</span>
              <div className="radar-contagem">
                <span className="tag ruim">{contagem.atencao} atenção</span>
                <span className="tag laranja">{contagem.oportunidade} oportunidades</span>
                <span className="tag bom">{contagem.positivo} positivos</span>
              </div>
            </div>
            <h2>{r.manchete}</h2>
            <p>{r.resumo}</p>
          </div>

          {p && (
            <div className="cards">
              <div className="card"><h3>Receitas do mês</h3><div className="valor pos"><Dinheiro valor={centavos(p.receitas)} tom="pos" animar /></div></div>
              <div className="card"><h3>Despesas do mês</h3><span className="badge">fixos, faturas e parcelas</span><div className="valor"><Dinheiro valor={centavos(p.despesas)} animar /></div></div>
              <div className="card"><h3>Saldo do mês</h3><span className="badge">hoje <Dinheiro valor={centavos(p.saldoAteHoje)} /></span><div className="valor"><Dinheiro valor={centavos(p.saldoDoMes)} tom="auto" animar /></div></div>
              <div className="card"><h3>Comprometimento</h3><span className={`badge ${p.comprometimento != null && p.comprometimento > 0.8 ? 'ruim' : ''}`}>despesas ÷ receitas</span><div className="valor">{p.comprometimento == null ? '—' : formatarPct(p.comprometimento)}</div></div>
            </div>
          )}

          <div className="dupla">
            <div className="secao">
              <div className="secao-topo"><h3>Insights</h3></div>
              {r.insights.map((i, k) => (
                <div key={k} className={`insight-card ${i.severidade}`} style={{ animationDelay: `${k * 60}ms` }}>
                  <span className="insight-icone">{ICONE[i.severidade]}</span>
                  <div>
                    <small>{ROTULO[i.severidade]}</small>
                    <strong>{i.titulo}</strong>
                    <p>{i.detalhe}</p>
                    {i.evidencia && <p className="insight-evidencia">{i.evidencia}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="secao">
              <div className="secao-topo"><h3>Plano</h3><span className="sutil">{r.plano.filter((_, i) => feitos[chave(i)]).length}/{r.plano.length} feitos</span></div>
              {r.plano.map((a, i) => (
                <label key={i} className={`plano-item ${feitos[chave(i)] ? 'feito' : ''}`}>
                  <input type="checkbox" className="sr" checked={!!feitos[chave(i)]} onChange={(e) => setFeitos((f) => ({ ...f, [chave(i)]: e.target.checked }))} />
                  <span className={`caixa ${feitos[chave(i)] ? 'on' : ''}`} aria-hidden="true">{feitos[chave(i)] && <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}</span>
                  <div><strong>{a.acao}</strong><span className={`tag ${a.prazo === 'semana' ? 'laranja' : ''}`}>{a.prazo === 'semana' ? 'esta semana' : 'este mês'}</span><p>{a.porque}</p></div>
                </label>
              ))}
              {r.pontosCegos.length > 0 && (
                <>
                  <div className="secao-topo" style={{ marginTop: 22 }}><h3>Pontos cegos</h3><span className="sutil">o que faltou para concluir</span></div>
                  {r.pontosCegos.map((x, k) => <p key={k} className="ponto-cego">? {x}</p>)}
                </>
              )}
            </div>
          </div>

          {p && p.proximosMeses.length > 0 && (
            <div className="secao">
              <div className="secao-topo"><h3>Projeção que a IA considerou</h3><span className="sutil">saldo de cada mês (receitas − despesas)</span></div>
              <LinhaValores altura={170} pontos={[{ rotulo: rotuloMes(c), valor: centavos(p.saldoDoMes), destaque: true }, ...p.proximosMeses.map((m) => ({ rotulo: rotuloMes(m.competencia), valor: centavos(m.saldo) }))]} />
            </div>
          )}

          <div className="secao">
            <button className="aba" onClick={() => setVerDados(!verDados)}>{verDados ? 'Esconder' : 'Ver'} o que foi enviado à IA</button>
            {verDados && atual?.resumo && <pre className="dados-enviados">{JSON.stringify(atual.resumo, null, 2)}</pre>}
          </div>
        </>
      )}

      {historico.length > 1 && (
        <div className="secao">
          <div className="secao-topo"><h3>Análises anteriores deste mês</h3></div>
          <div className="historico-radar">
            {historico.map((a) => {
              const res = JSON.parse(a.resultado_json) as ResultadoAnalise
              return (
                <button key={a.id} className={`historico-item ${a.criado_em === atual?.quando ? 'sel' : ''}`} onClick={() => abrir(a)}>
                  <strong>{res.manchete}</strong>
                  <small>{NOME_MOTOR[a.motor] ?? a.motor} · {quandoLegivel(a.criado_em)}</small>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
