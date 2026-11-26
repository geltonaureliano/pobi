import { useMemo, useState } from 'react'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia, rotuloMes, type Competencia } from '../shared/data'
import { formatarBRL, formatarPct, pctParaTexto, variacao } from '../shared/dinheiro'
import { atualizarReceita, criarReceita } from '../domain/receita/repository'
import { previsoesDoMes, totalPrevisto, type PrevisaoReceita } from '../domain/receita/rules'
import { camposDeReceita, receitaVazia, validarReceita, type CamposReceita } from '../domain/receita/form'
import type { Receita } from '../domain/receita/model'
import type { ConversaIA } from '../domain/assistente/model'
import { buscarConversa, buscarConversaDoItem } from '../domain/assistente/repository'
import { Modal, IconeEditar } from '../ui/components/Modal'
import { EscolhaCadastro } from '../ui/components/EscolhaCadastro'
import { Vazio } from '../ui/components/Campos'
import { Dinheiro } from '../ui/components/Dinheiro'
import { useForm } from '../ui/useForm'
import type { Dados } from '../ui/useDados'
import { Assistente } from './assistente/Assistente'
import { BotaoConversas, HistoricoConversas } from './assistente/Historico'
import { CamposReceitaForm } from './assistente/formularios'
import { toast } from '../ui/toast'

const ROTULO_REGRA = { FIXA: 'fixa', VARIAVEL: 'variável', HORAS: 'por hora' } as const
const fontes = (n: number) => `${n} ${n === 1 ? 'fonte' : 'fontes'}`
const br = (d: string) => d.split('-').reverse().slice(0, 2).join('/')

/** Texto curto que explica de onde veio o valor do mês. */
function comoCalculou(r: Receita, p: PrevisaoReceita) {
  if (p.horas) {
    const h = p.horas
    return `${h.dias} dias úteis de ${rotuloCompetencia(h.referencia).toLowerCase()} × ${pctParaTexto(r.horas_dia)}h × ${formatarBRL(r.valor_hora ?? 0)}/h${h.descontoPct ? ` − ${pctParaTexto(Math.round(h.descontoPct * 100) / 100)}%` : ''}`
  }
  if (p.regra === 'VARIAVEL') return p.faixa?.min || p.faixa?.max ? 'média · varia na faixa abaixo' : 'média esperada'
  return 'mesmo valor todo mês'
}

/**
 * Receitas: o que se espera receber, mês a mês. Não registra recebimento: a previsão
 * de cada mês vem da regra da receita (fixa, média ou por hora), sempre calculada do mês.
 */
export function Receitas({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const atual = competenciaDe(hoje())
  const [c, setC] = useState<Competencia>(atual)
  const [escolhendo, setEscolhendo] = useState(false)
  const [assistente, setAssistente] = useState<{ conversa: ConversaIA | null; editar: Receita | null } | null>(null)
  const [historico, setHistorico] = useState(false)
  const [editando, setEditando] = useState<Receita | 'nova' | null>(null)
  const principal = String(dados.contas.find((x) => x.principal)?.id ?? '')
  const form = useForm<CamposReceita>(receitaVazia(principal))

  const doMes = useMemo(() => previsoesDoMes(dados.receitas, c), [dados.receitas, c])
  const total = doMes.reduce((s, x) => s + x.previsao.valor, 0)
  const anterior = totalPrevisto(dados.receitas, deslocarCompetencia(c, -1))
  const fixas = doMes.filter((x) => x.previsao.regra === 'FIXA').reduce((s, x) => s + x.previsao.valor, 0)
  const meses = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const m = deslocarCompetencia(atual, i - 2)
    return { c: m, valor: totalPrevisto(dados.receitas, m) }
  }), [dados.receitas, atual])
  const maior = Math.max(1, ...meses.map((m) => m.valor))
  const fora = dados.receitas.filter((r) => !doMes.some((x) => x.receita.id === r.id))
  const v = variacao(total, anterior)

  if (assistente) {
    const { conversa: conv, editar } = assistente
    return <Assistente key={`${editar?.id ?? ''}-${conv?.id ?? 'nova'}`} alvo="receita" dados={dados} conversa={conv} editar={editar}
      trocar={(x) => setAssistente({ conversa: x, editar: null })}
      voltar={() => setAssistente(null)} concluir={(msg) => { setAssistente(null); toast.sucesso(msg); recarregar() }} />
  }

  /** Editar abre a página do assistente, com o chat ligado a essa receita. */
  async function editarComChat(r: Receita) {
    setAssistente({ conversa: await buscarConversaDoItem('receita', r.id).catch(() => null), editar: r })
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
    toast.sucesso(editando === 'nova' ? 'Receita cadastrada' : 'Receita atualizada', r.valor.nome)
    setEditando(null); recarregar()
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
      <HistoricoConversas alvo="receita" aberto={historico} fechar={() => setHistorico(false)} nova={() => setAssistente({ conversa: null, editar: null })}
        abrir={async (id) => { const x = await buscarConversa(id); if (x) setAssistente({ conversa: x, editar: x.status === 'CONCLUIDA' && x.item_id ? dados.receitas.find((r) => r.id === x.item_id) ?? null : null }) }} />
      <EscolhaCadastro aberto={escolhendo} fechar={() => setEscolhendo(false)} titulo="Nova receita" item="da receita"
        manual={() => { setEscolhendo(false); abrir() }} ia={() => { setEscolhendo(false); setAssistente({ conversa: null, editar: null }) }} />

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
          <table className="tabela tabela-receitas">
            <thead><tr>
              <th>Dia</th><th>Receita</th><th>Tipo</th><th>Origem</th><th>Como calcula</th>
              <th style={{ textAlign: 'right' }}>Bruto</th><th style={{ textAlign: 'right' }}>Taxas</th><th style={{ textAlign: 'right' }}>Previsto (líquido)</th><th />
            </tr></thead>
            <tbody>
              {doMes.map(({ receita: r, previsao: p }) => {
                const bruto = p.horas?.bruto ?? null
                const taxas = p.horas ? p.horas.desconto : null
                return (
                  <tr key={r.id}>
                    <td className="num-esq">{br(p.data)}</td>
                    <td><strong className="receita-titulo">{r.nome}</strong>{r.fonte && <div className="sutil">{r.fonte}</div>}</td>
                    <td><span className={`tag tipo-${p.horas ? 'horas' : p.regra.toLowerCase()}`}>{ROTULO_REGRA[p.horas ? 'HORAS' : p.regra]}</span></td>
                    <td>{r.origem === 'IA' ? <span className="tag ia">IA</span> : <span className="sutil">manual</span>}</td>
                    <td className="sutil">
                      {comoCalculou(r, p)}
                      {p.horas && p.horas.feriados.length > 0 && <div className="feriados">feriados: {p.horas.feriados.join(', ')}</div>}
                      {p.faixa && (p.faixa.min || p.faixa.max) ? <div className="faixa-tabela">faixa {p.faixa.min ? <Dinheiro valor={p.faixa.min} tom="neutro" /> : '—'} a {p.faixa.max ? <Dinheiro valor={p.faixa.max} tom="neutro" /> : '—'}</div> : null}
                    </td>
                    <td className="num">{bruto != null ? <Dinheiro valor={bruto} tom="neutro" /> : <span className="sutil">—</span>}</td>
                    <td className="num">{taxas ? <span className="taxa"><Dinheiro valor={-taxas} /><small>{pctParaTexto(Math.round(p.horas!.descontoPct * 100) / 100)}%</small></span> : <span className="sutil">—</span>}</td>
                    <td className="num previsto"><Dinheiro valor={p.valor} tom="pos" /></td>
                    <td><button className="botao-icone" onClick={() => editarComChat(r)} aria-label={`Editar ${r.nome}`} title="Editar (abre o assistente)"><IconeEditar /></button></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr>
              <td colSpan={5}>Total do mês</td>
              <td className="num"><Dinheiro valor={doMes.reduce((t, x) => t + (x.previsao.horas?.bruto ?? x.previsao.valor), 0)} tom="neutro" /></td>
              <td className="num"><Dinheiro valor={-doMes.reduce((t, x) => t + (x.previsao.horas?.desconto ?? 0), 0)} /></td>
              <td className="num previsto"><Dinheiro valor={total} tom="pos" /></td>
              <td />
            </tr></tfoot>
          </table>
        ) : <Vazio>{dados.receitas.length ? 'Nenhuma receita prevista para este mês.' : 'Cadastre o que você espera receber (salário, freelas, renda por hora) para ver a previsão de cada mês.'}</Vazio>}
        {fora.length > 0 && (
          <div className="fora-do-mes">
            <span className="sutil">Fora deste mês:</span>
            {fora.map((r) => (
              <span key={r.id} className="chip-fora">
                {r.nome} <small>{!r.ativa ? 'pausada' : r.inicio > `${c}-31` ? `começa ${br(r.inicio)}/${r.inicio.slice(2, 4)}` : 'encerrada'}</small>
                <button className="botao-icone" onClick={() => editarComChat(r)} aria-label={`Editar ${r.nome}`} title="Editar (abre o assistente)"><IconeEditar /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Modal titulo={editando === 'nova' ? 'Nova receita' : 'Editar receita'} aberto={editando != null} fechar={() => setEditando(null)} largura={680} rodape={<button className="botao" onClick={salvar}>Salvar</button>}>
        <CamposReceitaForm f={form} foco categorias={dados.categorias} contas={dados.contas.filter((x) => !x.arquivada)} />
      </Modal>

    </>
  )
}
