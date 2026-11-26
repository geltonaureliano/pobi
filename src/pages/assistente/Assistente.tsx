import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { hoje, competenciaDe, deslocarCompetencia } from '../../shared/data'
import { paraCentavos } from '../../shared/dinheiro'
import type { Motor } from '../../domain/analise/model'
import { comMotorDisponivel, lerAjuste, motoresDisponiveis, NOME_MOTOR, salvarAjuste, type MotorDisponivel } from '../../domain/analise/repository'
import type { AlvoAssistente, AnexoLocal, ConversaIA, MensagemChat, MetaConversa } from '../../domain/assistente/model'
import { aplicarNaDivida, aplicarNaReceita, interpretarAssistente, montarPromptAssistente, quandoLegivel, rascunhoDosCampos, tamanhoLegivel, tituloDaConversa } from '../../domain/assistente/rules'
import { buscarConversa, executarAssistente, lerArquivo, salvarConversa } from '../../domain/assistente/repository'
import { camposDividaVazios, totalDoFormulario, validarDivida, type CamposDivida } from '../../domain/divida/form'
import { criarDivida } from '../../domain/divida/repository'
import { alternarReceita, atualizarReceita, criarReceita, excluirReceita } from '../../domain/receita/repository'
import type { Receita } from '../../domain/receita/model'
import { BotaoExcluir } from '../../ui/components/Modal'
import { camposDeReceita, receitaVazia, validarReceita, type CamposReceita } from '../../domain/receita/form'
import { previsaoDaReceita } from '../../domain/receita/rules'
import { parametrosPorHora } from '../../domain/receita/form'
import { emTauri } from '../../db/client'
import { useForm } from '../../ui/useForm'
import { Dinheiro } from '../../ui/components/Dinheiro'
import { Simbolo } from '../../ui/components/Marca'
import type { Dados } from '../../ui/useDados'
import { CamposDividaForm, CamposReceitaForm } from './formularios'
import { HistoricoConversas } from './Historico'
import { toast } from '../../ui/toast'

const MAX_ARQUIVO = 20 * 1024 * 1024

/** Mesmo nome que o app nativo dá ao arquivo na pasta temporária (ver ai.rs). */
const nomeNaPasta = (nome: string, i: number) => {
  const base = [...nome].map((c) => (/[\p{L}\p{N}._-]/u.test(c) ? c : '_')).join('').replace(/^\.+/, '')
  return base ? `${String(i + 1).padStart(2, '0')}-${base}` : `anexo-${i}`
}

const SUGESTOES: Record<AlvoAssistente, string[]> = {
  divida: [
    'Financiamento do carro, 48x de R$ 1.290,00, já paguei 12, juros de 1,49% ao mês',
    'Empréstimo de R$ 10.000 no banco, 24 parcelas, primeira vence dia 10',
    'Anexei o contrato. Me diz quanto vou pagar de juros no total',
  ],
  receita: [
    'Salário de R$ 8.500 líquido, cai todo dia 5',
    'Freela que varia entre R$ 2.000 e R$ 4.500 por mês, recebo dia 15',
    'Anexei meus holerites dos últimos meses, calcula a média',
  ],
}

const SUGESTOES_EDICAO = [
  'Meu valor da hora subiu para R$ 100,00 a partir do mês que vem',
  'Anexei a última nota: recalcula o desconto até cair na conta',
  'O pagamento passou a cair no dia 5',
]

const ETAPAS_ARQUIVO = ['Lendo os arquivos…', 'Entendendo o documento…', 'Extraindo valores e datas…', 'Conferindo os cálculos…', 'Montando o resumo…']
const ETAPAS_TEXTO = ['Entendendo o que você escreveu…', 'Organizando os dados…', 'Montando o resumo…']

const ROTULOS: Record<string, string> = {
  nome: 'nome', tipo: 'tipo', credor: 'credor', contratado: 'valor contratado', valor_parcela: 'parcela', total: 'total', parcelas: 'nº de parcelas',
  parcelas_pagas: 'parcelas pagas', primeiro: '1º vencimento', data_contratacao: 'data do contrato', taxa: 'juros a.m.', taxa_anual: 'juros a.a.',
  cet: 'CET', sistema: 'sistema', observacao: 'observações', fonte: 'fonte', regra: 'regra', valor_hora: 'valor da hora', horas_dia: 'horas/dia', desconto_pct: 'desconto', defasagem: 'mês de referência', valor: 'valor', valor_min: 'mínimo',
  valor_max: 'máximo', dia: 'dia', inicio: 'início', fim: 'fim',
}

function diferencas(a: object, b: object) {
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>
  return Object.keys(y).filter((k) => x[k] !== y[k] && k !== 'modo')
}

/**
 * Página do assistente. Com `conversa`, retoma um rascunho salvo (ou mostra uma conversa já concluída).
 * `trocar` abre outra conversa (id) ou uma nova (null); o pai remonta o componente.
 */
export function Assistente({ alvo, dados, voltar, concluir, conversa, trocar, editar }: {
  alvo: AlvoAssistente; dados: Dados; voltar: () => void; concluir: (aviso: string) => void
  conversa?: ConversaIA | null; trocar: (c: ConversaIA | null) => void
  /** Receita já cadastrada a editar: o formulário vem dela e o chat continua a conversa ligada a ela. */
  editar?: Receita | null
}) {
  const principal = String(dados.contas.find((x) => x.principal)?.id ?? '')
  const catDividas = dados.categorias.find((k) => k.nome === 'Dívidas')?.id
  const camposIniciais = useRef(conversa?.campos)
  const fd = useForm<CamposDivida>({ ...camposDividaVazios(catDividas ? String(catDividas) : ''), primeiro: '', ...(alvo === 'divida' ? camposIniciais.current as Partial<CamposDivida> : {}) })
  const fr = useForm<CamposReceita>(editar ? camposDeReceita(editar) : { ...receitaVazia(principal), ...(alvo === 'receita' ? camposIniciais.current as Partial<CamposReceita> : {}) })
  const idConversa = useRef(conversa?.id ?? crypto.randomUUID())
  const concluida = conversa?.status === 'CONCLUIDA' && !editar
  const [historicoAberto, setHistoricoAberto] = useState(false)
  const [salvoEm, setSalvoEm] = useState<string | null>(conversa ? conversa.atualizado_em : null)
  const [versao, setVersao] = useState(0)

  const [motor, setMotor] = useState<Motor>('claude')
  const [motores, setMotores] = useState<MotorDisponivel[]>([])
  const arrastos = useRef(0)
  const [mensagens, setMensagens] = useState<MensagemChat[]>(conversa?.mensagens ?? [])
  const [arquivos, setArquivos] = useState<AnexoLocal[]>(conversa?.anexos ?? [])
  const [pendentes, setPendentes] = useState<AnexoLocal[]>([])
  const [texto, setTexto] = useState('')
  const [rodando, setRodando] = useState(false)
  const [etapa, setEtapa] = useState(0)
  const [arrastando, setArrastando] = useState(false)
  const [meta, setMeta] = useState<MetaConversa | null>(conversa?.meta ?? null)
  const [arrastandoJanela, setArrastandoJanela] = useState(false)
  const arrastosJanela = useRef(0)
  const [destacar, setDestacar] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const lista = useRef<HTMLDivElement>(null)
  const seletor = useRef<HTMLInputElement>(null)
  const caixa = useRef<HTMLTextAreaElement>(null)

  const motorDaConversa = conversa?.motor
  useEffect(() => {
    if (motorDaConversa === 'claude' || motorDaConversa === 'codex') setMotor(motorDaConversa)
    else lerAjuste('motor').then((m) => m && setMotor(m as Motor)).catch(() => {})
    motoresDisponiveis().then(setMotores).catch(() => {})
  }, [motorDaConversa])
  // Arrastar do Finder: só a caixa de texto aceita o arquivo. Enquanto arrasta pela janela, ela se destaca como convite.
  useEffect(() => {
    const comArquivo = (e: globalThis.DragEvent) => !!e.dataTransfer?.types.includes('Files')
    const evitar = (e: globalThis.DragEvent) => { if (comArquivo(e)) e.preventDefault() }
    const entra = (e: globalThis.DragEvent) => { if (comArquivo(e)) { arrastosJanela.current++; setArrastandoJanela(true) } }
    const sai = (e: globalThis.DragEvent) => { if (comArquivo(e)) { arrastosJanela.current = Math.max(0, arrastosJanela.current - 1); if (!arrastosJanela.current) setArrastandoJanela(false) } }
    const fim = () => { arrastosJanela.current = 0; setArrastandoJanela(false) }
    window.addEventListener('dragover', evitar)
    window.addEventListener('dragenter', entra)
    window.addEventListener('dragleave', sai)
    const solta = (e: globalThis.DragEvent) => { evitar(e); fim() }
    window.addEventListener('drop', solta)
    window.addEventListener('dragend', fim)
    return () => {
      window.removeEventListener('dragover', evitar); window.removeEventListener('dragenter', entra)
      window.removeEventListener('dragleave', sai); window.removeEventListener('dragend', fim); window.removeEventListener('drop', solta)
    }
  }, [])

  // Salva a conversa sozinho: a cada mensagem e, com uma pausa, a cada correção nos campos.
  const valoresAtuais = alvo === 'divida' ? fd.valores : fr.valores
  const valoresIniciais = useRef(JSON.stringify(valoresAtuais))
  const salvar = useRef<() => Promise<void>>(async () => {})
  salvar.current = async () => {
    const mexeu = mensagens.length > 0 || JSON.stringify(valoresAtuais) !== valoresIniciais.current
    if (!mexeu || concluida) return
    await salvarConversa({
      id: idConversa.current, alvo, status: editar ? 'CONCLUIDA' : 'RASCUNHO', item_id: editar?.id ?? null, motor,
      titulo: tituloDaConversa((valoresAtuais as { nome?: string }).nome, meta?.resumo, mensagens),
      mensagens, campos: valoresAtuais as unknown as Record<string, unknown>, meta, anexos: arquivos,
    })
    setSalvoEm(new Date().toISOString()); setVersao((v) => v + 1)
  }
  useEffect(() => {
    const t = setTimeout(() => { salvar.current().catch(() => {}) }, mensagens.length && mensagens[mensagens.length - 1].autor === 'ia' ? 0 : 700)
    return () => clearTimeout(t)
  }, [mensagens, meta, arquivos, valoresAtuais])
  async function sairSalvando() { await salvar.current().catch(() => {}); voltar() }
  async function abrirOutra(id: string | null) {
    await salvar.current().catch(() => {})
    trocar(id ? await buscarConversa(id) : null)
  }
  const [, relogio] = useState(0)
  useEffect(() => { const t = setInterval(() => relogio((x) => x + 1), 30000); return () => clearInterval(t) }, [])
  useEffect(() => { lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' }) }, [mensagens, rodando])
  useEffect(() => {
    if (!rodando) return
    setEtapa(0)
    const t = setInterval(() => setEtapa((e) => e + 1), 2600)
    return () => clearInterval(t)
  }, [rodando])
  useEffect(() => {
    if (!destacar.length) return
    const t = setTimeout(() => setDestacar([]), 2400)
    return () => clearTimeout(t)
  }, [destacar])
  useEffect(() => {
    const el = caixa.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [texto])

  async function anexar(lista: FileList | File[]) {
    const novos: AnexoLocal[] = []
    for (const f of Array.from(lista)) {
      if (f.size > MAX_ARQUIVO) { toast.aviso(`${f.name} ficou de fora`, 'O limite é 20 MB por arquivo.'); continue }
      try { novos.push(await lerArquivo(f)) } catch (e) { toast.erro('Não consegui ler o arquivo', (e as Error).message) }
    }
    setPendentes((p) => [...p, ...novos])
  }

  async function enviar(conteudo = texto) {
    const t = conteudo.trim()
    if ((!t && !pendentes.length) || rodando) return
    const msg: MensagemChat = { id: crypto.randomUUID(), autor: 'voce', texto: t, anexos: pendentes.map((a) => ({ nome: a.nome, tamanho: a.tamanho })) }
    const todos = [...arquivos, ...pendentes]
    const historico = [...mensagens, msg]
    setMensagens(historico); setArquivos(todos); setPendentes([]); setTexto(''); setRodando(true)
    try {
      const formAtual = alvo === 'divida' ? fd.valores : fr.valores
      const prompt = montarPromptAssistente({
        alvo, hoje: hoje(), historico, rascunhoAtual: rascunhoDosCampos(formAtual), arquivos: todos.map((a, i) => nomeNaPasta(a.nome, i)),
      })
      const exec = await comMotorDisponivel(motor, (m) => executarAssistente(m, prompt, todos, alvo, t))
      if (exec.motor !== motor) setMotor(exec.motor)
      const r = interpretarAssistente(exec.valor)
      if (exec.aviso) r.resposta = `${exec.aviso}\n\n${r.resposta}`
      let mudou: string[] = []
      if (alvo === 'divida') {
        const novo = aplicarNaDivida(fd.valores, r.rascunho)
        mudou = diferencas(fd.valores, novo); fd.setValores(novo); fd.setErros({})
      } else {
        const novo = aplicarNaReceita(fr.valores, r.rascunho)
        mudou = diferencas(fr.valores, novo); fr.setValores(novo); fr.setErros({})
      }
      setDestacar(mudou)
      if (r.resumo || r.pendencias.length || r.confianca) setMeta({ resumo: r.resumo ?? meta?.resumo ?? null, confianca: r.confianca ?? meta?.confianca ?? null, pendencias: r.pendencias })
      setMensagens((m) => [...m, { id: crypto.randomUUID(), autor: 'ia', texto: r.resposta, anexos: [], campos: mudou }])
    } catch (e) {
      setMensagens((m) => [...m, { id: crypto.randomUUID(), autor: 'ia', texto: e instanceof Error ? e.message : String(e), anexos: [], erro: true }])
    } finally {
      setRodando(false)
      caixa.current?.focus()
    }
  }

  function teclar(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); enviar() }
  }
  const temArquivo = (e: DragEvent) => e.dataTransfer.types.includes('Files')
  function entrar(e: DragEvent) { if (!temArquivo(e) || concluida) return; e.preventDefault(); arrastos.current++; setArrastando(true) }
  function sair(e: DragEvent) { if (!temArquivo(e)) return; arrastos.current = Math.max(0, arrastos.current - 1); if (!arrastos.current) setArrastando(false) }
  function soltar(e: DragEvent) {
    e.preventDefault(); arrastos.current = 0; setArrastando(false)
    if (e.dataTransfer.files.length) anexar(e.dataTransfer.files)
  }
  function trocarMotor(m: Motor) { setMotor(m); salvarAjuste('motor', m).catch(() => {}) }

  const rolarAteErro = () => requestAnimationFrame(() => document.querySelector('.revisao-form .com-erro')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))

  async function marcarConcluida(nome: string, item_id: number | null) {
    await salvarConversa({
      id: idConversa.current, alvo, status: 'CONCLUIDA', item_id, motor, titulo: nome,
      mensagens, campos: valoresAtuais as unknown as Record<string, unknown>, meta, anexos: arquivos,
    }).catch(() => {})
  }

  async function confirmar() {
    setSalvando(true)
    try {
      if (alvo === 'divida') {
        const r = validarDivida(fd.valores, true)
        if (!r.ok) { fd.setErros(r.erros); rolarAteErro(); toast.aviso('Faltam dados para cadastrar', 'Veja os campos marcados ao lado.'); return }
        const id = await criarDivida({ ...r.nova, origem: 'IA' })
        await marcarConcluida(r.nova.nome, id ?? null)
        concluir(`${r.nova.nome} cadastrada com ${r.nova.parcelas} parcelas.`)
      } else {
        const r = validarReceita(fr.valores)
        if (!r.ok) { fr.setErros(r.erros); rolarAteErro(); toast.aviso('Faltam dados para salvar', 'Veja os campos marcados ao lado.'); return }
        const v = r.valor
        if (editar) {
          await atualizarReceita(editar.id, v)
          await marcarConcluida(v.nome, editar.id)
          concluir(`${v.nome} atualizada.`)
          return
        }
        const id = await criarReceita({ ...v, origem: 'IA' })
        await marcarConcluida(v.nome, id ?? null)
        concluir(`${v.nome} cadastrada.`)
      }
    } finally {
      setSalvando(false)
    }
  }

  const destaques = useMemo(() => {
    if (alvo === 'divida') {
      const v = fd.valores
      const total = totalDoFormulario(v)
      const n = Number(v.parcelas) || 0
      const pagas = Number(v.parcelas_pagas) || 0
      const parcela = v.modo === 'PARCELA' ? paraCentavos(v.valor_parcela) : total && n ? Math.round(total / n) : null
      return [
        { rotulo: 'Parcela', valor: parcela ? <Dinheiro valor={parcela} /> : null, sub: n ? `${n}x` : null },
        { rotulo: 'Total a pagar', valor: total ? <Dinheiro valor={total} /> : null, sub: null },
        { rotulo: 'Falta pagar', valor: total && n ? <Dinheiro valor={Math.max(0, total - (parcela ?? 0) * pagas)} /> : null, sub: n ? `${Math.max(0, n - pagas)} parcelas` : null },
      ]
    }
    const v = fr.valores
    const valor = paraCentavos(v.valor)
    const min = paraCentavos(v.valor_min ?? ''), max = paraCentavos(v.valor_max ?? '')
    return [
      ...(v.regra === 'HORAS' ? (() => {
        const ph = parametrosPorHora(v)
        const c0 = competenciaDe(hoje())
        const p = (i: number) => ph ? previsaoDaReceita({ valor: 1, inicio: '0000-01-01', fim: null, regra: 'HORAS', ...ph }, deslocarCompetencia(c0, i)) : null
        const a = p(0), b = p(1)
        return [
          { rotulo: 'Este mês', valor: a ? <Dinheiro valor={a.valor} /> : null, sub: a ? `${a.horas!.dias} dias úteis` : null },
          { rotulo: 'Próximo mês', valor: b ? <Dinheiro valor={b.valor} /> : null, sub: b ? `${b.horas!.dias} dias úteis` : null },
          { rotulo: 'Valor da hora', valor: ph ? <Dinheiro valor={ph.valor_hora} /> : null, sub: ph ? `${v.horas_dia}h/dia` : null },
        ]
      })() : [
      { rotulo: v.regra === 'VARIAVEL' ? 'Média por mês' : 'Por mês', valor: valor ? <Dinheiro valor={valor} /> : null, sub: v.dia ? `dia ${v.dia}` : null },
      { rotulo: 'Faixa', valor: v.regra === 'VARIAVEL' && (min || max) ? <span className="faixa">{min ? <Dinheiro valor={min} /> : '—'} a {max ? <Dinheiro valor={max} /> : '—'}</span> : null, sub: v.regra === 'VARIAVEL' ? 'variável' : 'fixa' },
      { rotulo: 'Por ano', valor: valor ? <Dinheiro valor={valor * 12} /> : null, sub: null },
    ]),
    ]
  }, [alvo, fd.valores, fr.valores])

  const etapas = arquivos.length ? ETAPAS_ARQUIVO : ETAPAS_TEXTO
  const nomeItem = alvo === 'divida' ? 'dívida' : 'receita'
  const contas = dados.contas.filter((x) => !x.arquivada)

  return (
    <div className="assistente">
      <header className="assistente-topo">
        <button className="botao-voltar" onClick={sairSalvando}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {alvo === 'divida' ? 'Dívidas' : 'Receitas'}
        </button>
        <div className="assistente-titulo">
          <h1>{editar ? fr.valores.nome || editar.nome : concluida ? conversa?.titulo : conversa || mensagens.length ? tituloDaConversa((valoresAtuais as { nome?: string }).nome, meta?.resumo, mensagens) : `Nova ${nomeItem} com IA`}</h1>
          <span className="sutil salvo">
            {editar ? <>{editar.ativa ? 'Editando' : 'Pausada · editando'}{salvoEm ? <> · <i className="ponto-salvo" />conversa salva {quandoLegivel(salvoEm)}</> : ' · peça mudanças no chat ou edite ao lado'}</> : concluida ? <>Cadastrada · conversa salva</> : salvoEm ? <><i className="ponto-salvo" />Rascunho salvo {quandoLegivel(salvoEm)}</> : 'Conte, cole ou anexe. Tudo é salvo como rascunho até você confirmar.'}
          </span>
        </div>
        {editar && (
          <div className="acoes-item">
            <button className="botao secundario" onClick={async () => { await alternarReceita(editar.id, !editar.ativa); concluir(`${editar.nome} ${editar.ativa ? 'pausada: saiu da previsão' : 'reativada'}.`) }}>
              {editar.ativa ? 'Pausar' : 'Reativar'}
            </button>
            <BotaoExcluir rotulo="Excluir" onConfirmar={async () => { await excluirReceita(editar.id); concluir(`${editar.nome} excluída.`) }} />
          </div>
        )}
        <button className="botao secundario botao-conversas" onClick={() => setHistoricoAberto(true)} title="Conversas e rascunhos">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 3.5h11v7h-6l-3 2.5v-2.5h-2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
          Conversas
        </button>
        {emTauri() ? (
          <div className="motores" role="radiogroup" aria-label="Motor de IA">
            {(['claude', 'codex'] as Motor[]).map((m) => {
              const ok = motores.find((x) => x.motor === m)?.caminho
              return (
                <button key={m} role="radio" aria-checked={motor === m} className={motor === m ? 'on' : ''} disabled={rodando}
                  title={ok ? `Usar o ${NOME_MOTOR[m]} (${ok})` : `${NOME_MOTOR[m]} não encontrado neste Mac`} onClick={() => trocarMotor(m)}>
                  <i className={ok ? 'ok' : 'ausente'} />{NOME_MOTOR[m]}
                </button>
              )
            })}
          </div>
        ) : <span className="motor-selo demo" title="No navegador a IA é simulada"><i />Demonstração</span>}
      </header>

      <div className="assistente-corpo">
        <section className="chat">
          <div className="chat-lista" ref={lista}>
            {!mensagens.length && (
              <div className="chat-vazio">
                <div className="chat-vazio-icone"><Simbolo tamanho={44} /></div>
                <h2>{editar ? `O que mudou em ${editar.nome}?` : `Como é essa ${nomeItem}?`}</h2>
                <p>{editar
                  ? 'Conte a mudança ou anexe a nota, holerite ou contrato novo. Eu atualizo os campos ao lado e você salva quando estiver certo.'
                  : 'Escreva do seu jeito ou anexe qualquer arquivo: contrato, boleto, extrato, print, PDF, planilha, foto. Eu leio, extraio os detalhes e monto o cadastro ao lado.'}</p>
                <div className="chat-sugestoes">
                  {(editar ? SUGESTOES_EDICAO : SUGESTOES[alvo]).map((s) => <button key={s} onClick={() => { setTexto(s); caixa.current?.focus() }}>{s}</button>)}
                </div>
              </div>
            )}
            {mensagens.map((m) => (
              <div key={m.id} className={`msg ${m.autor} ${m.erro ? 'erro' : ''}`}>
                {m.autor === 'ia' && <span className="msg-avatar"><Simbolo tamanho={18} /></span>}
                <div className="msg-corpo">
                  {m.anexos.length > 0 && (
                    <div className="msg-anexos">{m.anexos.map((a) => <span key={a.nome} className="anexo-chip"><IconeArquivo nome={a.nome} />{a.nome}<small>{tamanhoLegivel(a.tamanho)}</small></span>)}</div>
                  )}
                  {m.texto && <div className="msg-texto">{m.texto}</div>}
                  {m.campos && m.campos.length > 0 && (
                    <div className="msg-campos"><IconeVisto />Preenchi: {m.campos.map((c) => ROTULOS[c] ?? c).join(', ')}</div>
                  )}
                  {m.erro && <button className="aba" onClick={() => { const ultima = [...mensagens].reverse().find((x) => x.autor === 'voce'); setMensagens((x) => x.filter((y) => y.id !== m.id && y.id !== ultima?.id)); if (ultima) enviar(ultima.texto) }}>tentar de novo</button>}
                </div>
              </div>
            ))}
            {rodando && (
              <div className="msg ia">
                <span className="msg-avatar pulsando"><Simbolo tamanho={18} /></span>
                <div className="msg-corpo"><div className="msg-texto digitando"><span className="pontos"><i /><i /><i /></span>{etapas[Math.min(etapa, etapas.length - 1)]}</div></div>
              </div>
            )}
          </div>

          {concluida ? (
            <div className="composer-concluida">
              <IconeVisto />
              <span>Esta conversa já virou cadastro. O histórico fica aqui para consulta.</span>
              <button className="botao secundario" onClick={() => abrirOutra(null)}>Nova conversa</button>
            </div>
          ) : (
          <div
            className={`composer ${arrastando ? 'soltando' : arrastandoJanela ? 'convidando' : ''}`}
            onDragEnter={entrar}
            onDragOver={(e) => { if (temArquivo(e)) { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' } }}
            onDragLeave={sair}
            onDrop={soltar}
          >
            {pendentes.length > 0 && (
              <div className="composer-anexos">
                {pendentes.map((a) => (
                  <span key={a.id} className="anexo-chip">
                    <IconeArquivo nome={a.nome} />{a.nome}<small>{tamanhoLegivel(a.tamanho)}</small>
                    <button aria-label={`Remover ${a.nome}`} onClick={() => setPendentes((p) => p.filter((x) => x.id !== a.id))}>×</button>
                  </span>
                ))}
              </div>
            )}
            {(arrastando || arrastandoJanela) && <div className="composer-soltar"><IconeArquivo nome="" />{arrastando ? 'Solte para anexar' : 'Arraste até aqui para anexar'}</div>}
            <textarea
              ref={caixa} rows={1} value={texto} autoFocus disabled={rodando}
              placeholder={mensagens.length ? 'Responda, corrija algo ou tire uma dúvida…' : editar ? 'Conte o que mudou ou anexe um arquivo novo…' : `Descreva a ${nomeItem} ou anexe arquivos…`}
              onChange={(e) => setTexto(e.target.value)} onKeyDown={teclar}
              onPaste={(e) => { if (e.clipboardData.files.length) { e.preventDefault(); anexar(e.clipboardData.files) } }}
            />
            <div className="composer-barra">
              <button className="botao-icone" onClick={() => seletor.current?.click()} disabled={rodando} title="Anexar arquivos (qualquer tipo)">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 7.5l-5.3 5.3a3.2 3.2 0 01-4.5-4.5l5.6-5.6a2.1 2.1 0 013 3L6.2 11.3a1 1 0 01-1.5-1.5L10 4.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                Anexar
              </button>
              <input ref={seletor} type="file" multiple hidden onChange={(e) => { if (e.target.files) anexar(e.target.files); e.target.value = '' }} />
              <span className="composer-dica">Enter envia · Shift+Enter quebra linha · arraste arquivos para cá ou cole</span>
              <button className="botao-enviar" onClick={() => enviar()} disabled={rodando || (!texto.trim() && !pendentes.length)} aria-label="Enviar">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
          )}
        </section>

        <aside className="revisao">
          <div className="revisao-topo">
            <div>
              <h3>Resumo para confirmar</h3>
              {meta?.confianca && <span className={`tag ${meta.confianca === 'alta' ? 'bom' : meta.confianca === 'baixa' ? 'ruim' : 'laranja'}`}>confiança {meta.confianca === 'media' ? 'média' : meta.confianca}</span>}
            </div>
            <p className={meta?.resumo ? 'revisao-resumo' : 'revisao-resumo apagado'}>{meta?.resumo ?? 'O que a IA entender aparece aqui. Você também pode preencher ou corrigir à mão.'}</p>
          </div>
          <div className="revisao-destaques">
            {destaques.map((d) => (
              <div key={d.rotulo} className={`destaque ${d.valor ? 'cheio' : ''}`}>
                <span>{d.rotulo}</span>
                <strong>{d.valor ?? <i className="esqueleto" />}</strong>
                {d.sub && <small>{d.sub}</small>}
              </div>
            ))}
          </div>
          {meta && meta.pendencias.length > 0 && (
            <div className="revisao-pendencias">
              <strong>Para confirmar</strong>
              <ul>{meta.pendencias.map((p) => <li key={p}><button onClick={() => { setTexto(`Sobre "${p}": `); caixa.current?.focus() }}>{p}</button></li>)}</ul>
            </div>
          )}
          <div className="revisao-form">
            {alvo === 'divida'
              ? <CamposDividaForm f={fd} nova foco={false} categorias={dados.categorias} destacar={destacar} />
              : <CamposReceitaForm f={fr} categorias={dados.categorias} contas={contas} destacar={destacar} />}
          </div>
          <div className="revisao-rodape">
            <button className="botao secundario" onClick={sairSalvando}>{concluida || editar ? 'Voltar' : 'Sair (fica salvo)'}</button>
            {!concluida && <button className="botao laranja" onClick={confirmar} disabled={salvando || rodando}>{salvando ? 'Salvando…' : editar ? 'Salvar alterações' : `Confirmar e cadastrar`}</button>}
          </div>
        </aside>
      </div>
      <HistoricoConversas alvo={alvo} aberto={historicoAberto} fechar={() => setHistoricoAberto(false)} atual={idConversa.current} versao={versao}
        abrir={(id) => abrirOutra(id)} nova={() => abrirOutra(null)} />
    </div>
  )
}

function IconeArquivo({ nome, grande }: { nome: string; grande?: boolean }) {
  const ext = nome.split('.').pop()?.toLowerCase() ?? ''
  const tipo = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext) ? 'img' : ext === 'pdf' ? 'pdf' : ['xls', 'xlsx', 'csv', 'numbers'].includes(ext) ? 'planilha' : 'doc'
  return (
    <span className={`arquivo-icone ${tipo} ${grande ? 'grande' : ''}`} aria-hidden="true">
      {tipo === 'img'
        ? <svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" /><circle cx="6" cy="6.5" r="1.2" fill="currentColor" /><path d="M3 12l3.5-3.5 2.5 2.5 2-2 2.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
        : <svg viewBox="0 0 16 16"><path d="M4 1.5h5.5L13 5v9.5H4z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M9.5 1.5V5H13" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>}
    </span>
  )
}

const IconeVisto = () => (<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>)
