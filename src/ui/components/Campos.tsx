import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type InputHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { paraCentavos } from '../../shared/dinheiro'

/*
 * Kit de formulário do Pobi. Todos os controles têm a mesma altura (--ctl-h), o mesmo raio,
 * o mesmo foco laranja e o mesmo estado de erro. Os de texto recebem `value` e `onChange(valor)`,
 * que é o formato devolvido por `useForm().campo(chave)`.
 */

type Valor = { value: string; onChange: (v: string) => void }
type Base = { erro?: boolean; disabled?: boolean; id?: string }

export function Campo({ rotulo, erro, dica, children, largo }: { rotulo: string; erro?: string; dica?: string; children: ReactNode; largo?: boolean }) {
  return (
    <label className={`campo ${erro ? 'com-erro' : ''}`} style={largo ? { gridColumn: '1 / -1' } : undefined}>
      <span className="campo-rotulo">{rotulo}</span>
      {children}
      {erro ? <span className="campo-erro">{erro}</span> : dica ? <span className="campo-dica">{dica}</span> : null}
    </label>
  )
}

export function Vazio({ children }: { children: ReactNode }) {
  return <div className="vazio">{children}</div>
}

/* ---------- Texto ---------- */

type TextoProps = Valor & Base & Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'prefix'> & {
  prefixo?: ReactNode; sufixo?: ReactNode; numerico?: boolean
}

export function Texto({ value, onChange, erro, prefixo, sufixo, numerico, className, ...resto }: TextoProps) {
  return (
    <div className={`ctl ${erro ? 'erro' : ''} ${resto.disabled ? 'desativado' : ''} ${className ?? ''}`}>
      {prefixo && <span className="ctl-afixo">{prefixo}</span>}
      <input
        {...resto}
        inputMode={numerico ? 'numeric' : resto.inputMode}
        value={value}
        onChange={(e) => onChange(numerico ? e.target.value.replace(/\D/g, '') : e.target.value)}
      />
      {sufixo && <span className="ctl-afixo">{sufixo}</span>}
    </div>
  )
}

export function Busca({ value, onChange, placeholder = 'Buscar' }: Valor & { placeholder?: string }) {
  return (
    <Texto
      value={value} onChange={onChange} placeholder={placeholder}
      prefixo={<svg viewBox="0 0 16 16" className="ctl-icone"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>}
      sufixo={value ? <button type="button" className="ctl-limpar" aria-label="Limpar" onClick={() => onChange('')}>×</button> : undefined}
    />
  )
}

export function AreaTexto({ value, onChange, erro, linhas = 3, ...resto }: Valor & Base & { placeholder?: string; linhas?: number; autoFocus?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <div className={`ctl ctl-area ${erro ? 'erro' : ''}`}>
      <textarea ref={ref} rows={linhas} {...resto} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function Data({ value, onChange, erro, ...resto }: Valor & Base & { min?: string; max?: string }) {
  return (
    <div className={`ctl ctl-data ${erro ? 'erro' : ''}`}>
      <input type="date" {...resto} value={value} onChange={(e) => onChange(e.target.value)} />
      <svg viewBox="0 0 16 16" className="ctl-icone ctl-icone-fim" aria-hidden="true">
        <rect x="1.5" y="2.5" width="13" height="12" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1.5 6.5h13M5 1v3M11 1v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  )
}

/* ---------- Moeda (R$) ---------- */

const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** Centavos → "1.234,56" (sem o "R$"). */
const textoMoeda = (centavos: number) => brl.format(centavos / 100)

/**
 * Campo de dinheiro estilo app de banco: você digita só números e eles entram pela direita
 * (1 → 0,01 · 12 → 0,12 · 1234 → 12,34). Backspace apaga o último dígito.
 * Com `negativo`, a tecla "-" inverte o sinal. O valor devolvido é texto "1.234,56".
 */
export function Moeda({ value, onChange, erro, negativo, autoFocus, disabled, placeholder = '0,00' }: Valor & Base & { negativo?: boolean; autoFocus?: boolean; placeholder?: string }) {
  const centavos = paraCentavos(value)
  const neg = centavos != null && centavos < 0
  const texto = centavos == null ? '' : `${neg ? '-' : ''}${textoMoeda(Math.abs(centavos))}`
  const ref = useRef<HTMLInputElement>(null)

  function emitir(digitos: string, sinalNeg: boolean) {
    const limpo = digitos.replace(/^0+/, '').slice(0, 13)
    if (!limpo) return onChange('')
    onChange(`${sinalNeg ? '-' : ''}${textoMoeda(Number(limpo))}`)
  }
  function teclar(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === '-' || e.key === '+') {
      e.preventDefault()
      if (negativo && centavos) emitir(String(Math.abs(centavos)), e.key === '-' ? !neg : false)
    }
  }
  // O cursor fica sempre no fim: os dígitos entram pela direita.
  useLayoutEffect(() => {
    const el = ref.current
    if (el && document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length)
  }, [texto])

  return (
    <div className={`ctl ctl-moeda ${erro ? 'erro' : ''} ${neg ? 'negativo' : ''} ${disabled ? 'desativado' : ''}`}>
      <span className="ctl-afixo moeda-simbolo">R$</span>
      <input
        ref={ref} inputMode="decimal" autoComplete="off" autoFocus={autoFocus} disabled={disabled}
        placeholder={placeholder} value={texto} onKeyDown={teclar}
        onFocus={(e) => { const el = e.currentTarget; requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length)) }}
        onChange={(e) => emitir(e.target.value.replace(/\D/g, ''), neg || (negativo === true && e.target.value.trim().startsWith('-')))}
      />
    </div>
  )
}

/* ---------- Seleção (popover) ---------- */

export type Item = { id: number | string; nome: string; cor?: string | null; dica?: string }

function usePopover(aberto: boolean, fechar: () => void) {
  const gatilho = useRef<HTMLButtonElement>(null)
  const painel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number; width: number; acima: boolean } | null>(null)

  useLayoutEffect(() => {
    if (!aberto) return
    const medir = () => {
      const r = gatilho.current?.getBoundingClientRect()
      if (!r) return
      const acima = window.innerHeight - r.bottom < 280 && r.top > window.innerHeight - r.bottom
      setPos({ left: r.left, top: acima ? r.top - 6 : r.bottom + 6, width: r.width, acima })
    }
    medir()
    window.addEventListener('resize', medir)
    window.addEventListener('scroll', medir, true)
    return () => { window.removeEventListener('resize', medir); window.removeEventListener('scroll', medir, true) }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node
      if (!gatilho.current?.contains(alvo) && !painel.current?.contains(alvo)) fechar()
    }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [aberto, fechar])

  const estilo = pos ? {
    left: pos.left, width: Math.max(pos.width, 200),
    ...(pos.acima ? { bottom: window.innerHeight - pos.top } : { top: pos.top }),
  } : { visibility: 'hidden' as const }
  return { gatilho, painel, estilo }
}

const Seta = () => (
  <svg viewBox="0 0 16 16" className="ctl-icone ctl-seta" aria-hidden="true"><path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
)
const Visto = () => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
)

function ListaOpcoes({ itens, marcado, escolher, busca, setBusca, ativo, setAtivo, teclar, multiplo }: {
  itens: Item[]; marcado: (id: string) => boolean; escolher: (id: string) => void
  busca: string | null; setBusca: (v: string) => void; ativo: number; setAtivo: (i: number) => void
  teclar: (e: KeyboardEvent) => void; multiplo?: boolean
}) {
  const lista = useRef<HTMLDivElement>(null)
  useEffect(() => { lista.current?.querySelector<HTMLElement>(`[data-i="${ativo}"]`)?.scrollIntoView({ block: 'nearest' }) }, [ativo])
  return (
    <>
      {busca != null && (
        <div className="pop-busca">
          <input autoFocus placeholder="Filtrar…" value={busca} onChange={(e) => { setBusca(e.target.value); setAtivo(0) }} onKeyDown={teclar} />
        </div>
      )}
      <div className="pop-lista" ref={lista} role="listbox" aria-multiselectable={multiplo}>
        {itens.length === 0 && <div className="pop-vazio">Nada encontrado</div>}
        {itens.map((it, i) => {
          const id = String(it.id)
          const sel = marcado(id)
          return (
            <div
              key={id} data-i={i} role="option" aria-selected={sel}
              className={`pop-item ${sel ? 'sel' : ''} ${i === ativo ? 'ativo' : ''} ${id === '' ? 'nulo' : ''}`}
              onMouseEnter={() => setAtivo(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => escolher(id)}
            >
              {multiplo && <span className={`caixa-mini ${sel ? 'on' : ''}`}>{sel && <Visto />}</span>}
              {it.cor && <span className="bolinha" style={{ background: it.cor, margin: 0 }} />}
              <span className="pop-nome">{it.nome}{it.dica && <small>{it.dica}</small>}</span>
              {!multiplo && sel && <span className="pop-visto"><Visto /></span>}
            </div>
          )
        })}
      </div>
    </>
  )
}

function useNavegacao(itens: Item[], aberto: boolean, abrir: () => void, fechar: () => void, escolher: (id: string) => void) {
  const [ativo, setAtivo] = useState(0)
  function teclar(e: KeyboardEvent) {
    if (!aberto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); abrir() }
      return
    }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setAtivo((a) => Math.min(a + 1, itens.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setAtivo((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const it = itens[ativo]; if (it) escolher(String(it.id)) }
    else if (e.key === 'Tab') fechar()
  }
  return { ativo, setAtivo, teclar }
}

const filtrar = (itens: Item[], q: string) => {
  const t = q.trim().toLowerCase()
  return t ? itens.filter((i) => i.nome.toLowerCase().includes(t)) : itens
}

/**
 * Select bonito com teclado (setas, Enter, Esc). Com mais de 7 opções aparece um filtro.
 * `vazio` é o rótulo da opção "nenhum" (null para não ter).
 */
export function Selecao({ value, onChange, itens, vazio = 'Nenhum', placeholder = 'Selecione', erro, disabled, id }: Valor & Base & {
  itens: Item[]; vazio?: string | null; placeholder?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const todos = useMemo(() => (vazio != null ? [{ id: '', nome: vazio }, ...itens] : itens), [itens, vazio])
  const comBusca = itens.length > 7
  const visiveis = comBusca ? filtrar(todos, busca) : todos
  const atual = todos.find((i) => String(i.id) === value)
  const fechar = () => { setAberto(false); setBusca('') }
  const escolher = (v: string) => { onChange(v); fechar(); pop.gatilho.current?.focus() }
  const pop = usePopover(aberto, fechar)
  const nav = useNavegacao(visiveis, aberto, () => {
    setAberto(true)
    nav.setAtivo(Math.max(0, todos.findIndex((i) => String(i.id) === value)))
  }, fechar, escolher)
  const auto = useId()

  return (
    <>
      <button
        id={id ?? auto} type="button" ref={pop.gatilho} disabled={disabled}
        className={`ctl ctl-select ${aberto ? 'aberto' : ''} ${erro ? 'erro' : ''}`}
        aria-haspopup="listbox" aria-expanded={aberto}
        onClick={() => (aberto ? fechar() : (setAberto(true), nav.setAtivo(Math.max(0, todos.findIndex((i) => String(i.id) === value)))))}
        onKeyDown={nav.teclar}
      >
        {atual?.cor && <span className="bolinha" style={{ background: atual.cor, margin: 0 }} />}
        <span className={`ctl-valor ${!atual || atual.id === '' ? 'placeholder' : ''}`}>{atual ? atual.nome : placeholder}</span>
        <Seta />
      </button>
      {aberto && createPortal(
        <div className="pop" ref={pop.painel} style={pop.estilo} onMouseDown={(e) => e.stopPropagation()}>
          <ListaOpcoes
            itens={visiveis} marcado={(i) => i === value} escolher={escolher}
            busca={comBusca ? busca : null} setBusca={setBusca} ativo={nav.ativo} setAtivo={nav.setAtivo} teclar={nav.teclar}
          />
        </div>,
        document.body,
      )}
    </>
  )
}

/** Seleção múltipla: mostra até dois chips e um "+N". */
export function MultiSelecao({ valores, onChange, itens, placeholder = 'Todos', erro, disabled }: {
  valores: string[]; onChange: (v: string[]) => void; itens: Item[]; placeholder?: string
} & Base) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const visiveis = filtrar(itens, busca)
  const fechar = () => { setAberto(false); setBusca('') }
  const alternar = (v: string) => onChange(valores.includes(v) ? valores.filter((x) => x !== v) : [...valores, v])
  const pop = usePopover(aberto, fechar)
  const nav = useNavegacao(visiveis, aberto, () => setAberto(true), fechar, alternar)
  const escolhidos = itens.filter((i) => valores.includes(String(i.id)))

  return (
    <>
      <button
        type="button" ref={pop.gatilho} disabled={disabled}
        className={`ctl ctl-select ctl-multi ${aberto ? 'aberto' : ''} ${erro ? 'erro' : ''}`}
        aria-haspopup="listbox" aria-expanded={aberto}
        onClick={() => (aberto ? fechar() : setAberto(true))} onKeyDown={nav.teclar}
      >
        <span className="ctl-valor">
          {escolhidos.length === 0 && <span className="placeholder">{placeholder}</span>}
          {escolhidos.slice(0, 2).map((i) => (
            <span className="chip" key={i.id}>
              {i.cor && <span className="bolinha" style={{ background: i.cor, margin: 0 }} />}{i.nome}
            </span>
          ))}
          {escolhidos.length > 2 && <span className="chip chip-mais">+{escolhidos.length - 2}</span>}
        </span>
        {escolhidos.length > 0 && (
          <span className="ctl-limpar" role="button" aria-label="Limpar seleção" onClick={(e) => { e.stopPropagation(); onChange([]) }}>×</span>
        )}
        <Seta />
      </button>
      {aberto && createPortal(
        <div className="pop" ref={pop.painel} style={pop.estilo} onMouseDown={(e) => e.stopPropagation()}>
          <ListaOpcoes
            itens={visiveis} marcado={(i) => valores.includes(i)} escolher={alternar} multiplo
            busca={itens.length > 7 ? busca : null} setBusca={setBusca} ativo={nav.ativo} setAtivo={nav.setAtivo} teclar={nav.teclar}
          />
          {valores.length > 0 && (
            <div className="pop-rodape"><span>{valores.length} selecionada{valores.length > 1 ? 's' : ''}</span><button type="button" onClick={() => onChange([])}>limpar</button></div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}

/** Escolha entre poucas opções lado a lado (ex.: Despesa · Receita · Transferência). */
export function Segmentos({ value, onChange, itens }: Valor & { itens: Item[] }) {
  return (
    <div className="ctl ctl-segmentos" role="radiogroup">
      {itens.map((i) => (
        <button key={i.id} type="button" role="radio" aria-checked={String(i.id) === value}
          className={String(i.id) === value ? 'on' : ''} onClick={() => onChange(String(i.id))}>
          {i.nome}
        </button>
      ))}
    </div>
  )
}

/* ---------- Liga/desliga ---------- */

type Marca = { checked: boolean; onChange: (v: boolean) => void; rotulo: ReactNode; descricao?: ReactNode; largo?: boolean; disabled?: boolean }

export function Interruptor({ checked, onChange, rotulo, descricao, largo, disabled }: Marca) {
  return (
    <label className={`opcao ${disabled ? 'desativado' : ''}`} style={largo ? { gridColumn: '1 / -1' } : undefined}>
      <input type="checkbox" className="sr" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={`switch ${checked ? 'on' : ''}`} aria-hidden="true"><i /></span>
      <span className="opcao-texto">{rotulo}{descricao && <small>{descricao}</small>}</span>
    </label>
  )
}

export function Caixa({ checked, onChange, rotulo, descricao, largo, disabled }: Marca) {
  return (
    <label className={`opcao ${disabled ? 'desativado' : ''}`} style={largo ? { gridColumn: '1 / -1' } : undefined}>
      <input type="checkbox" className="sr" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={`caixa ${checked ? 'on' : ''}`} aria-hidden="true">{checked && <Visto />}</span>
      <span className="opcao-texto">{rotulo}{descricao && <small>{descricao}</small>}</span>
    </label>
  )
}
