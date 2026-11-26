import { useMemo, useState } from 'react'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia, rotuloMes, type Competencia } from '../shared/data'
import { formatarBRL, formatarPct, paraCentavos, pctParaTexto, variacao } from '../shared/dinheiro'
import { alternarReceita, atualizarReceita, criarReceita, excluirReceita, salvarAjusteReceita } from '../domain/receita/repository'
import { previsoesDoMes, totalPrevisto, type PrevisaoReceita } from '../domain/receita/rules'
import { camposDeReceita, receitaVazia, validarReceita, type CamposReceita } from '../domain/receita/form'
import type { AjusteReceitaMes, Receita } from '../domain/receita/model'
import type { ConversaIA } from '../domain/assistente/model'
import { buscarConversa } from '../domain/assistente/repository'
import { Modal, BotaoExcluir, IconeEditar } from '../ui/components/Modal'
import { EscolhaCadastro } from '../ui/components/EscolhaCadastro'
import { Campo, Moeda, Texto, Vazio } from '../ui/components/Campos'
import { Dinheiro } from '../ui/components/Dinheiro'
import { useForm } from '../ui/useForm'
import type { Dados } from '../ui/useDados'
import { Assistente } from './assistente/Assistente'
import { BotaoConversas, HistoricoConversas } from './assistente/Historico'
import { CamposReceitaForm } from './assistente/formularios'

const ROTULO_REGRA = { FIXA: 'fixa', VARIAVEL: 'variável', HORAS: 'por hora' } as const
const fontes = (n: number) => `${n} ${n === 1 ? 'fonte' : 'fontes'}`
const br = (d: string) => d.split('-').reverse().slice(0, 2).join('/')

/** Texto curto que explica de onde veio o valor do mês. */
function comoCalculou(r: Receita, p: PrevisaoReceita) {
  if (p.horas) {
    const h = p.horas
    return `${h.dias} ${p.ajustado && h.dias !== h.diasCalendario ? 'dias trabalhados' : 'dias úteis'} de ${rotuloCompetencia(h.referencia).toLowerCase()} × ${pctParaTexto(r.horas_dia)}h × ${formatarBRL(r.valor_hora ?? 0)}/h${h.descontoPct ? ` − ${pctParaTexto(Math.round(h.descontoPct * 100) / 100)}%` : ''}`
  }
  if (p.regra === 'VARIAVEL') return p.faixa?.min || p.faixa?.max ? 'média · varia na faixa abaixo' : 'média esperada'
  return 'mesmo valor todo mês'
}

/**
 * Receitas: o que se espera receber, mês a mês. Não registra recebimento: a previsão
 * de cada mês vem da regra da receita (fixa, média ou por hora) e de ajustes do mês.
 */
export function Receitas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const atual = competenciaDe(hoje())
  const [c, setC] = useState<Competencia>(atual)
  const [escolhendo, setEscolhendo] = useState(false)
  const [conversa, setConversa] = useState<ConversaIA | 'nova' | null>(null)
  const [historico, setHistorico] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState<Receita | 'nova' | null>(null)
  const [ajustando, setAjustando] = useState<{ receita: Receita; previsao: PrevisaoReceita } | null>(null)
  const principal = String(dados.contas.find((x) => x.principal)?.id ?? '')
  const form = useForm<CamposReceita>(receitaVazia(principal))
  const fa = useForm({ dias: '', valor: '', observacao: '' })

  const ajustes = dados.receitasMes
  const doMes = useMemo(() => previsoesDoMes(dados.receitas, c, ajustes), [dados.receitas, c, ajustes])
  const total = doMes.reduce((s, x) => s + x.previsao.valor, 0)
  const anterior = totalPrevisto(dados.receitas, deslocarCompetencia(c, -1), ajustes)
  const fixas = doMes.filter((x) => x.previsao.regra === 'FIXA').reduce((s, x) => s + x.previsao.valor, 0)
  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = deslocarCompetencia(atual, i - 2)
    return { c: m, valor: totalPrevisto(dados.receitas, m, ajustes) }
  }), [dados.receitas, ajustes, atual])
  const maior = Math.max(1, ...meses.map((m) => m.valor))
  const fora = dados.receitas.filter((r) => !doMes.some((x) => x.receita.id === r.id))
  const v = variacao(total, anterior)

  if (conversa) {
    const conv = conversa === 'nova' ? null : conversa
    return <Assistente key={conv?.id ?? 'nova'} alvo="receita" dados={dados} conversa={conv} trocar={(x) => setConversa(x ?? 'nova')}
      voltar={() => setConversa(null)} concluir={(msg) => { setConversa(null); setAviso(msg); recarregar() }} />
  }

  function abrir(r?: Receita) {
    form.reiniciar(r ? camposDeReceita(r) : receitaVazia(principal))
    setEditando(r ?? 'nova')
  }
  async function salvar() {
    const r = validarReceita(form.valores)
    if (!r.ok) return form.setErros(r.erros)
    if (editando === 'nova') await criarReceita(r.valor)
    else if (editando) await atualizarReceita(editando.id, r.valor)
    setEditando(null); recarregar()
  }
  function abrirAjuste(receita: Receita, previsao: PrevisaoReceita, ajuste: AjusteReceitaMes | null) {
    fa.reiniciar({ dias: ajuste?.dias != null ? String(ajuste.dias) : '', valor: ajuste?.valor != null ? (ajuste.valor / 100).toFixed(2).replace('.', ',') : '', observacao: ajuste?.observacao ?? '' })
    setAjustando({ receita, previsao })
  }
  async function salvarAjuste(limpar = false) {
    if (!ajustando) return
    const dias = !limpar && fa.valores.dias.trim() ? Number(fa.valores.dias) : null
    const valor = !limpar && fa.valores.valor.trim() ? paraCentavos(fa.valores.valor) : null
    if (dias != null && !(Number.isInteger(dias) && dias >= 0 && dias <= 31)) return fa.setErros({ dias: 'De 0 a 31.' })
    await salvarAjusteReceita({ receita_id: ajustando.receita.id, competencia: c, dias, valor, observacao: limpar ? null : fa.valores.observacao.trim() || null })
    setAjustando(null); recarregar()
  }

  return (
    <>
      <div className="topo">
        <h1>Receitas</h1>
        <div className="acoes">
          <div className="mes-nav">
            <button className="aba" onClick={() => setC(deslocarCompetencia(c, -1))} aria-label="Mês anterior">←</button>
            <button className={`aba ${c === atual ? 'ativa' : ''}`} onClick={() => setC(atual)} title="Voltar para este mês">{rotuloCompetencia(c)}</button>
            <button className="aba" onClick={() => setC(deslocarCompetencia(c, 1))} aria-label="Próximo mês">→</button>
          </div>
          <BotaoConversas alvo="receita" onClick={() => setHistorico(true)} />
          <button className="botao" onClick={() => setEscolhendo(true)}>Nova receita</button>
        </div>
      </div>
      <HistoricoConversas alvo="receita" aberto={historico} fechar={() => setHistorico(false)} nova={() => setConversa('nova')}
        abrir={async (id) => { const x = await buscarConversa(id); if (x) setConversa(x) }} />
      <EscolhaCadastro aberto={escolhendo} fechar={() => setEscolhendo(false)} titulo="Nova receita" item="da receita"
        manual={() => { setEscolhendo(false); abrir() }} ia={() => { setEscolhendo(false); setConversa('nova') }} />
      {aviso && <div className="secao"><div className="aviso sucesso">{aviso}</div></div>}

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card">
          <h3>Previsto em {rotuloCompetencia(c)}</h3>
          {v != null ? <span className={`badge ${v >= 0 ? 'bom' : 'ruim'}`}>{formatarPct(v, true)} vs {rotuloMes(deslocarCompetencia(c, -1)).toLowerCase()}</span> : <span className="badge" style={{ visibility: 'hidden' }}>-</span>}
          <div className="valor pos"><Dinheiro valor={total} animar tom="pos" /></div>
        </div>
        <div className="card"><h3>Fixas</h3><span className="badge">{fontes(doMes.filter((x) => x.previsao.regra === 'FIXA').length)}</span><div className="valor"><Dinheiro valor={fixas} animar /></div></div>
        <div className="card"><h3>Variáveis e por hora</h3><span className="badge">{fontes(doMes.filter((x) => x.previsao.regra !== 'FIXA').length)}</span><div className="valor"><Dinheiro valor={total - fixas} animar /></div></div>
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>Próximos meses</h3><span className="sutil">clique num mês para ver o detalhe</span></div>
        <div className="meses-barras">
          {meses.map((m) => (
            <button key={m.c} className={`mes-barra ${m.c === c ? 'sel' : ''} ${m.c === atual ? 'hoje' : ''} ${m.c < atual ? 'passado' : ''}`} onClick={() => setC(m.c)}
              title={`${rotuloCompetencia(m.c)}: R$ ${(m.valor / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
              <span className="mes-barra-valor"><Dinheiro valor={Math.round(m.valor / 100) * 100} tom="neutro" /></span>
              <span className="mes-barra-trilho"><i style={{ height: `${Math.max(4, (m.valor / maior) * 100)}%` }} /></span>
              <span className="mes-barra-rotulo">{rotuloMes(m.c)}{m.c.slice(5) === '01' && <small>{m.c.slice(0, 4)}</small>}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>O que cai em {rotuloCompetencia(c).toLowerCase()}</h3><span className="sutil"><Dinheiro valor={total} /></span></div>
        {doMes.length ? (
          <table className="tabela">
            <thead><tr><th>Dia</th><th>Receita</th><th>Como calcula</th><th style={{ textAlign: 'right' }}>Previsto</th><th /></tr></thead>
            <tbody>
              {doMes.map(({ receita: r, previsao: p, ajuste }) => (
                <tr key={r.id}>
                  <td className="num-esq">{br(p.data)}</td>
                  <td>
                    <div className="receita-nome">
                      <strong>{r.nome}</strong>
                      <span className={`tag ${p.regra === 'FIXA' ? '' : 'laranja'}`}>{ROTULO_REGRA[r.regra ?? p.regra]}</span>
                      {r.origem === 'IA' && <span className="tag ia">IA</span>}
                      {p.ajustado && <span className="tag bom" title={ajuste?.observacao ?? undefined}>ajustado</span>}
                    </div>
                    {r.fonte && <div className="sutil">{r.fonte}</div>}
                  </td>
                  <td className="sutil">
                    {comoCalculou(r, p)}
                    {p.horas && p.horas.feriados.length > 0 && <div className="feriados">feriados: {p.horas.feriados.join(', ')}</div>}
                    {p.faixa && (p.faixa.min || p.faixa.max) ? <div className="faixa-tabela">{p.faixa.min ? <Dinheiro valor={p.faixa.min} tom="neutro" /> : '—'} a {p.faixa.max ? <Dinheiro valor={p.faixa.max} tom="neutro" /> : '—'}</div> : null}
                  </td>
                  <td className="num">
                    <Dinheiro valor={p.valor} tom="pos" />
                    {p.horas && <div className="sutil faixa-tabela">bruto <Dinheiro valor={p.horas.bruto} tom="neutro" /></div>}
                  </td>
                  <td>
                    <div className="acoes">
                      <button className="aba" onClick={() => abrirAjuste(r, p, ajuste)} title="Ajustar só este mês">ajustar mês</button>
                      <button className="botao-icone" onClick={() => abrir(r)} aria-label={`Editar ${r.nome}`} title="Editar"><IconeEditar /></button>
                      <button className="botao-icone" onClick={async () => { await alternarReceita(r.id, false); recarregar() }} title="Pausar (sai da previsão)" aria-label={`Pausar ${r.nome}`}>
                        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.5 3.5v9M10.5 3.5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                      </button>
                      <BotaoExcluir icone rotulo={`Excluir ${r.nome}`} onConfirmar={async () => { await excluirReceita(r.id); recarregar() }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <Vazio>{dados.receitas.length ? 'Nenhuma receita prevista para este mês.' : 'Cadastre o que você espera receber (salário, freelas, renda por hora) para ver a previsão de cada mês.'}</Vazio>}
        {fora.length > 0 && (
          <div className="fora-do-mes">
            <span className="sutil">Fora deste mês:</span>
            {fora.map((r) => (
              <span key={r.id} className="chip-fora">
                {r.nome} <small>{!r.ativa ? 'pausada' : r.inicio > `${c}-31` ? `começa ${br(r.inicio)}/${r.inicio.slice(2, 4)}` : 'encerrada'}</small>
                {!r.ativa && <button className="aba" onClick={async () => { await alternarReceita(r.id, true); recarregar() }}>reativar</button>}
                <button className="botao-icone" onClick={() => abrir(r)} aria-label={`Editar ${r.nome}`}><IconeEditar /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Modal titulo={editando === 'nova' ? 'Nova receita' : 'Editar receita'} aberto={editando != null} fechar={() => setEditando(null)} largura={680} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
        <CamposReceitaForm f={form} foco categorias={dados.categorias} contas={dados.contas.filter((x) => !x.arquivada)} />
      </Modal>

      <Modal titulo={ajustando ? `${ajustando.receita.nome} · ${rotuloCompetencia(c)}` : ''} aberto={ajustando != null} fechar={() => setAjustando(null)} largura={520}
        rodape={<>
          {ajustando?.previsao.ajustado && <button className="botao secundario" onClick={() => salvarAjuste(true)}>Voltar ao calculado</button>}
          <button className="botao" onClick={() => salvarAjuste()}>Salvar ajuste</button>
        </>}>
        {ajustando?.previsao.horas && (
          <Campo rotulo={`Dias trabalhados em ${rotuloCompetencia(ajustando.previsao.horas.referencia).toLowerCase()}`} erro={fa.erros.dias}
            dica={`Calculado: ${ajustando.previsao.horas.diasCalendario} dias úteis${ajustando.previsao.horas.feriados.length ? ` (sem ${ajustando.previsao.horas.feriados.join(', ')})` : ''}`}>
            <Texto numerico maxLength={2} placeholder={String(ajustando.previsao.horas.diasCalendario)} {...fa.campo('dias')} />
          </Campo>
        )}
        <Campo rotulo="Ou o valor exato que vai cair" erro={fa.erros.valor} dica="Se preencher, vale este valor"><Moeda {...fa.campo('valor')} /></Campo>
        <Campo rotulo="Motivo" largo><Texto placeholder="Folga, férias, hora extra, bônus…" {...fa.campo('observacao')} /></Campo>
        <p className="sutil" style={{ gridColumn: '1 / -1', margin: 0 }}>O ajuste vale só para {rotuloCompetencia(c).toLowerCase()}. Os outros meses continuam pela regra da receita.</p>
      </Modal>
    </>
  )
}
