import { useMemo, useState } from 'react'
import { competenciaDe, dataNoMes, deslocarCompetencia, diasNoMes, hoje, rotuloCompetencia, type Competencia } from '../shared/data'
import { ativoNaCompetencia } from '../domain/custo-fixo/rules'
import type { CustoFixo } from '../domain/custo-fixo/model'
import { criarCustoFixo } from '../domain/custo-fixo/repository'
import { custoVazio, validarCusto, type CamposCusto } from '../domain/custo-fixo/form'
import { criarCategoria } from '../domain/categoria/repository'
import type { ConversaIA } from '../domain/assistente/model'
import { buscarConversa, buscarConversaDoItem } from '../domain/assistente/repository'
import { Modal, IconeEditar } from '../ui/components/Modal'
import { EscolhaCadastro } from '../ui/components/EscolhaCadastro'
import { Vazio } from '../ui/components/Campos'
import { Dinheiro } from '../ui/components/Dinheiro'
import { useForm } from '../ui/useForm'
import { toast } from '../ui/toast'
import type { Dados } from '../ui/useDados'
import { Assistente } from './assistente/Assistente'
import { BotaoConversas, HistoricoConversas } from './assistente/Historico'
import { CamposCustoForm } from './assistente/formularios'

const br = (d: string) => d.split('-').reverse().slice(0, 2).join('/')

/**
 * Custos fixos: um registro de despesa que se repete todo mês (valor, dia, categoria e de onde sai).
 * Não há confirmação de pagamento aqui; o mês mostra o que vence e quanto soma.
 */
export function CustosFixos({ dados, recarregar }: { dados: Dados; recarregar: () => void }) {
  const atual = competenciaDe(hoje())
  const [c, setC] = useState<Competencia>(atual)
  const [escolhendo, setEscolhendo] = useState(false)
  const [historico, setHistorico] = useState(false)
  const [assistente, setAssistente] = useState<{ conversa: ConversaIA | null; editar: CustoFixo | null } | null>(null)
  const [novo, setNovo] = useState(false)
  const principal = String(dados.contas.find((x) => x.principal)?.id ?? '')
  const form = useForm<CamposCusto>(custoVazio(principal))

  const doMes = useMemo(() => dados.custosFixos
    .filter((cf) => cf.ativo && ativoNaCompetencia(cf, c))
    .map((cf) => ({ cf, data: dataNoMes(c, cf.dia_vencimento ?? diasNoMes(c)) }))
    .sort((a, b) => a.data.localeCompare(b.data) || b.cf.valor - a.cf.valor), [dados.custosFixos, c])
  const total = doMes.reduce((s, x) => s + x.cf.valor, 0)
  const fora = dados.custosFixos.filter((cf) => !doMes.some((x) => x.cf.id === cf.id))
  const porCategoria = useMemo(() => {
    const m = new Map<string, number>()
    doMes.forEach(({ cf }) => {
      const nome = dados.categorias.find((k) => k.id === cf.categoria_id)?.nome ?? 'Sem categoria'
      m.set(nome, (m.get(nome) ?? 0) + cf.valor)
    })
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [doMes, dados.categorias])

  if (assistente) {
    const { conversa: conv, editar } = assistente
    return <Assistente key={`${editar?.id ?? ''}-${conv?.id ?? 'nova'}`} alvo="custo" dados={dados} conversa={conv} editar={editar}
      trocar={(x) => setAssistente({ conversa: x, editar: null })}
      voltar={() => setAssistente(null)} concluir={(msg) => { setAssistente(null); toast.sucesso(msg); recarregar() }} />
  }

  /** Editar abre a página do assistente, com o chat ligado a esse custo. */
  async function editarComChat(cf: CustoFixo) {
    setAssistente({ conversa: await buscarConversaDoItem('custo', cf.id).catch(() => null), editar: cf })
  }
  async function salvarNovo() {
    const r = validarCusto(form.valores)
    if (!r.ok) return form.setErros(r.erros)
    let categoria_id = r.valor.categoria_id
    if (r.categoriaNova) categoria_id = (await criarCategoria(r.categoriaNova, 'DESPESA', false)) ?? null
    await criarCustoFixo({ ...r.valor, categoria_id })
    toast.sucesso('Custo fixo cadastrado', r.valor.nome)
    setNovo(false); recarregar()
  }

  const categoria = (id: number | null) => dados.categorias.find((k) => k.id === id)
  const origem = (cf: CustoFixo) => cf.cartao_id
    ? { nome: dados.cartoes.find((x) => x.id === cf.cartao_id)?.nome ?? 'Cartão', cartao: true }
    : { nome: dados.contas.find((x) => x.id === cf.conta_id)?.nome ?? '—', cartao: false }

  return (
    <>
      <div className="topo">
        <h1>Custos fixos</h1>
        <div className="acoes">
          <div className="mes-nav">
            <button className="aba" onClick={() => setC(deslocarCompetencia(c, -1))} aria-label="Mês anterior">←</button>
            <button className={`aba ${c === atual ? 'ativa' : ''}`} onClick={() => setC(atual)} title="Voltar para este mês">{rotuloCompetencia(c)}</button>
            <button className="aba" onClick={() => setC(deslocarCompetencia(c, 1))} aria-label="Próximo mês">→</button>
          </div>
          <BotaoConversas alvo="custo" onClick={() => setHistorico(true)} />
          <button className="botao" onClick={() => setEscolhendo(true)}>Novo custo fixo</button>
        </div>
      </div>
      <HistoricoConversas alvo="custo" aberto={historico} fechar={() => setHistorico(false)} nova={() => setAssistente({ conversa: null, editar: null })}
        abrir={async (id) => { const x = await buscarConversa(id); if (x) setAssistente({ conversa: x, editar: x.status === 'CONCLUIDA' && x.item_id ? dados.custosFixos.find((cf) => cf.id === x.item_id) ?? null : null }) }} />
      <EscolhaCadastro aberto={escolhendo} fechar={() => setEscolhendo(false)} titulo="Novo custo fixo" item="do custo"
        manual={() => { setEscolhendo(false); form.reiniciar(custoVazio(principal)); setNovo(true) }} ia={() => { setEscolhendo(false); setAssistente({ conversa: null, editar: null }) }} />

      <div className="cards" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card"><h3>Total em {rotuloCompetencia(c)}</h3><span className="badge">{doMes.length} {doMes.length === 1 ? 'custo' : 'custos'}</span><div className="valor"><Dinheiro valor={total} animar /></div></div>
        <div className="card"><h3>Em 12 meses</h3><span className="badge">no ritmo deste mês</span><div className="valor"><Dinheiro valor={total * 12} animar /></div></div>
        <div className="card">
          <h3>Maior categoria</h3>
          <span className="badge">{porCategoria[0] ? `${Math.round((porCategoria[0][1] / (total || 1)) * 100)}% do total` : '—'}</span>
          <div className="valor valor-texto">{porCategoria[0]?.[0] ?? '—'}</div>
        </div>
      </div>

      <div className="secao">
        <div className="secao-topo"><h3>O que vence em {rotuloCompetencia(c).toLowerCase()}</h3><span className="sutil"><Dinheiro valor={total} /></span></div>
        {doMes.length ? (
          <table className="tabela tabela-receitas">
            <thead><tr><th>Dia</th><th>Custo</th><th>Categoria</th><th>Sai de</th><th>Origem</th><th style={{ textAlign: 'right' }}>Valor</th><th /></tr></thead>
            <tbody>
              {doMes.map(({ cf, data }) => {
                const k = categoria(cf.categoria_id)
                const o = origem(cf)
                return (
                  <tr key={cf.id}>
                    <td className="num-esq">{br(data)}</td>
                    <td><strong className="receita-titulo">{cf.nome}</strong>{cf.observacao && <div className="sutil linha-unica">{cf.observacao}</div>}</td>
                    <td>{k ? <span className="cat-chip"><i style={{ background: k.cor ?? '#a6a399' }} />{k.nome}</span> : <span className="sutil">sem categoria</span>}</td>
                    <td className="sutil">{o.nome}{o.cartao && <span className="tag tipo-horas" style={{ marginLeft: 6 }}>cartão</span>}</td>
                    <td>{cf.origem === 'IA' ? <span className="tag ia">IA</span> : <span className="sutil">manual</span>}</td>
                    <td className="num valor-custo"><Dinheiro valor={cf.valor} /></td>
                    <td><button className="botao-icone" onClick={() => editarComChat(cf)} aria-label={`Editar ${cf.nome}`} title="Editar (abre o assistente)"><IconeEditar /></button></td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr><td colSpan={5}>Total do mês</td><td className="num valor-custo"><Dinheiro valor={total} /></td><td /></tr></tfoot>
          </table>
        ) : <Vazio>{dados.custosFixos.length ? 'Nenhum custo fixo neste mês.' : 'Cadastre aluguel, internet, assinaturas… e veja quanto sai todo mês.'}</Vazio>}
        {fora.length > 0 && (
          <div className="fora-do-mes">
            <span className="sutil">Fora deste mês:</span>
            {fora.map((cf) => (
              <span key={cf.id} className="chip-fora">
                {cf.nome} <small>{!cf.ativo ? 'pausado' : cf.inicio > `${c}-31` ? `começa ${br(cf.inicio)}/${cf.inicio.slice(2, 4)}` : 'encerrado'}</small>
                <button className="botao-icone" onClick={() => editarComChat(cf)} aria-label={`Editar ${cf.nome}`} title="Editar (abre o assistente)"><IconeEditar /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {porCategoria.length > 1 && (
        <div className="secao">
          <div className="secao-topo"><h3>Por categoria</h3></div>
          {porCategoria.map(([nome, valor]) => (
            <div className="barra-linha" key={nome}>
              <div className="barra-rotulo"><span>{nome}</span><span className="sutil"><Dinheiro valor={valor} /> · {Math.round((valor / (total || 1)) * 100)}%</span></div>
              <div className="barra"><i style={{ width: `${(valor / (total || 1)) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      <Modal titulo="Novo custo fixo" aberto={novo} fechar={() => setNovo(false)} largura={620} rodape={<button className="botao" onClick={salvarNovo}>Salvar</button>}>
        <CamposCustoForm f={form} foco categorias={dados.categorias} contas={dados.contas.filter((x) => !x.arquivada)} cartoes={dados.cartoes.filter((x) => !x.arquivado)} />
      </Modal>
    </>
  )
}
