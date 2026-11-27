import { useEffect, useRef, useState } from 'react'
import type { Motor } from '../domain/analise/model'
import { lerAjuste, motoresDisponiveis, NOME_MOTOR, salvarAjuste, type MotorDisponivel } from '../domain/analise/repository'
import { emTauri } from '../db/client'
import { toast } from '../ui/toast'
import { CORES_AVATAR, imagemParaAvatar, salvarPerfil, usePerfil } from '../ui/perfil'
import { Avatar } from '../ui/components/Avatar'
import { Campo, Texto } from '../ui/components/Campos'
import type { Dados } from '../ui/useDados'
import { Contas } from './Contas'
import { Categorias } from './Categorias'

export type AbaAjustes = 'perfil' | 'contas' | 'categorias' | 'ia' | 'dados'
const ABAS: { id: AbaAjustes; nome: string; dica: string }[] = [
  { id: 'perfil', nome: 'Perfil', dica: 'nome e foto' },
  { id: 'contas', nome: 'Contas', dica: 'bancos e carteiras' },
  { id: 'categorias', nome: 'Categorias', dica: 'despesas e receitas' },
  { id: 'ia', nome: 'Inteligência artificial', dica: 'Claude Code ou Codex' },
  { id: 'dados', nome: 'Dados e privacidade', dica: 'banco local' },
]

export function Ajustes({ dados, recarregar, aba, setAba }: { dados: Dados; recarregar: () => void; aba: AbaAjustes; setAba: (a: AbaAjustes) => void }) {
  return (
    <div className="ajustes">
      <div className="topo"><h1>Ajustes</h1></div>
      <div className="ajustes-corpo">
        <nav className="ajustes-abas" aria-label="Seções de ajustes">
          {ABAS.map((a) => (
            <button key={a.id} className={aba === a.id ? 'on' : ''} onClick={() => setAba(a.id)}>
              <strong>{a.nome}</strong><small>{a.dica}</small>
            </button>
          ))}
        </nav>
        <div className="ajustes-conteudo" key={aba}>
          {aba === 'perfil' && <AbaPerfil />}
          {aba === 'contas' && <Contas dados={dados} recarregar={recarregar} />}
          {aba === 'categorias' && <Categorias dados={dados} recarregar={recarregar} />}
          {aba === 'ia' && <AbaIA />}
          {aba === 'dados' && <AbaDados dados={dados} />}
        </div>
      </div>
    </div>
  )
}

function AbaPerfil() {
  const perfil = usePerfil()
  const [nome, setNome] = useState(perfil.nome)
  const [erro, setErro] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState(false)
  const seletor = useRef<HTMLInputElement>(null)
  useEffect(() => setNome(perfil.nome), [perfil.nome])

  async function trocarFoto(arquivo?: File) {
    if (!arquivo) return
    try { await salvarPerfil({ avatar: await imagemParaAvatar(arquivo) }); toast.sucesso('Foto atualizada') }
    catch (e) { toast.erro('Não deu para usar essa imagem', (e as Error).message) }
  }
  async function salvarNome() {
    const n = nome.trim()
    if (!n) return setErro('Informe um nome.')
    setErro(null)
    if (n === perfil.nome) return
    await salvarPerfil({ nome: n })
    toast.sucesso('Nome atualizado', n)
  }

  return (
    <div className="secao">
      <div className="secao-topo"><h3>Perfil</h3><span className="sutil">aparece no rodapé do menu</span></div>
      <div className="perfil-ajustes">
        <div
          className={`perfil-foto ${arrastando ? 'arrastando' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true) }} onDragLeave={() => setArrastando(false)}
          onDrop={(e) => { e.preventDefault(); setArrastando(false); trocarFoto(e.dataTransfer.files[0]) }}
        >
          <Avatar perfil={perfil} tamanho={112} />
          <div className="perfil-foto-acoes">
            <button className="botao secundario" onClick={() => seletor.current?.click()}>{perfil.avatar ? 'Trocar foto' : 'Escolher foto'}</button>
            {perfil.avatar && <button className="aba" onClick={async () => { await salvarPerfil({ avatar: null }); toast.info('Foto removida') }}>remover</button>}
            <input ref={seletor} type="file" accept="image/*" hidden onChange={(e) => { trocarFoto(e.target.files?.[0]); e.target.value = '' }} />
          </div>
          <small className="sutil">ou arraste uma imagem aqui</small>
        </div>
        <div className="perfil-campos">
          <Campo rotulo="Nome" erro={erro ?? undefined}>
            <Texto value={nome} onChange={setNome} maxLength={40} onKeyDown={(e) => { if (e.key === 'Enter') salvarNome() }} onBlur={salvarNome} placeholder="Seu nome" />
          </Campo>
          {!perfil.avatar && (
            <div className="campo">
              <span className="campo-rotulo">Cor das iniciais</span>
              <div className="cores">
                {CORES_AVATAR.map((cor) => (
                  <button key={cor} type="button" aria-label={`Cor ${cor}`} aria-pressed={perfil.cor === cor} className={`cor ${perfil.cor === cor ? 'on' : ''}`}
                    style={{ background: cor, ['--cor' as string]: cor }} onClick={() => salvarPerfil({ cor })}>
                    {perfil.cor === cor && <svg viewBox="0 0 16 16"><path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="sutil" style={{ margin: 0 }}>A foto fica só no seu computador, guardada no banco local do Pobi.</p>
        </div>
      </div>
    </div>
  )
}

function AbaIA() {
  const [motores, setMotores] = useState<MotorDisponivel[] | null>(null)
  const [motor, setMotor] = useState<Motor>('claude')
  useEffect(() => {
    motoresDisponiveis().then(setMotores).catch(() => setMotores([]))
    lerAjuste('motor').then((m) => m && setMotor(m as Motor)).catch(() => {})
  }, [])
  async function usar(m: Motor) { await salvarAjuste('motor', m); setMotor(m); toast.sucesso(`Usando o ${NOME_MOTOR[m]}`, 'No assistente de cadastro e no Radar IA') }

  return (
    <div className="secao">
      <div className="secao-topo"><h3>Motor de IA</h3><span className="sutil">roda no seu Mac, sem chave de API</span></div>
      <div className="motores-cards">
        {(['claude', 'codex'] as Motor[]).map((m) => {
          const info = motores?.find((x) => x.motor === m)
          const ok = !!info?.caminho
          return (
            <div key={m} className={`motor-card ${motor === m ? 'on' : ''}`}>
              <div className="motor-card-topo">
                <strong>{NOME_MOTOR[m]}</strong>
                <span className={`tag ${ok ? 'bom' : emTauri() ? 'ruim' : ''}`}>{motores == null ? 'verificando…' : ok ? 'instalado' : emTauri() ? 'não encontrado' : 'só no app'}</span>
              </div>
              <code>{info?.caminho ?? (m === 'claude' ? 'instale o Claude Code e faça login com /login' : 'vem junto com o app do ChatGPT/Codex')}</code>
              <button className={motor === m ? 'botao' : 'botao secundario'} disabled={motor === m} onClick={() => usar(m)}>{motor === m ? 'Em uso' : 'Usar este'}</button>
            </div>
          )
        })}
      </div>
      <p className="sutil" style={{ marginBottom: 0 }}>Se o motor escolhido não estiver instalado ou logado, o Pobi tenta o outro sozinho e avisa. Para o Claude Code, se pedir login: abra o Terminal, rode <code>claude</code> e digite <code>/login</code>.</p>
    </div>
  )
}

function AbaDados({ dados }: { dados: Dados }) {
  const caminho = '~/Library/Application Support/com.gelton.pobi/financas.db'
  const itens = [
    { nome: 'Receitas', n: dados.receitas.length }, { nome: 'Custos fixos', n: dados.custosFixos.length }, { nome: 'Cartões', n: dados.cartoes.length },
    { nome: 'Faturas informadas', n: dados.faturas.length }, { nome: 'Dívidas', n: dados.dividas.length }, { nome: 'Lançamentos', n: dados.lancamentos.length },
    { nome: 'Contas', n: dados.contas.length }, { nome: 'Categorias', n: dados.categorias.length },
  ]
  return (
    <>
      <div className="secao">
        <div className="secao-topo"><h3>Banco de dados</h3><span className="sutil">SQLite local</span></div>
        <div className="caminho-banco">
          <code>{caminho}</code>
          <button className="aba" onClick={async () => { try { await navigator.clipboard.writeText(caminho); toast.info('Caminho copiado') } catch { toast.erro('Não deu para copiar') } }}>copiar</button>
        </div>
        <div className="contagens">{itens.map((i) => <div key={i.nome}><strong>{i.n}</strong><span>{i.nome}</span></div>)}</div>
      </div>
      <div className="secao">
        <div className="secao-topo"><h3>Privacidade</h3></div>
        <ul className="lista-privacidade">
          <li>Tudo fica neste Mac. O Pobi não tem servidor nem conta online.</li>
          <li>Nas análises do Radar IA vão só totais agregados do mês, nunca o extrato linha a linha.</li>
          <li>No assistente de cadastro, os arquivos que você anexa vão para uma pasta temporária, que a IA só pode ler e que é apagada depois.</li>
          <li>De cartões, o Pobi guarda só os 4 últimos dígitos.</li>
        </ul>
      </div>
    </>
  )
}
