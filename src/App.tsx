import { useState, type ReactNode } from 'react'
import { Icones } from './ui/icones'
import { useDados } from './ui/useDados'
import { Painel } from './pages/Painel'
import { Lancamentos } from './pages/Lancamentos'
import { Contas } from './pages/Contas'
import { Receitas, CustosFixos } from './pages/Recorrentes'
import { Dividas } from './pages/Dividas'
import { Orcamentos } from './pages/Orcamentos'
import { Categorias } from './pages/Categorias'
import { Relatorio } from './pages/Relatorio'
import { Anual } from './pages/Anual'
import { Analises } from './pages/Analises'
import { Ajustes } from './pages/Ajustes'

type Pagina = keyof typeof Icones & string
const MENU: { grupo: string; itens: { id: Exclude<Pagina, 'logo'>; rotulo: string }[] }[] = [
  { grupo: 'Principal', itens: [{ id: 'painel', rotulo: 'Painel' }, { id: 'lancamentos', rotulo: 'Lançamentos' }] },
  { grupo: 'Análise', itens: [{ id: 'relatorio', rotulo: 'Relatório mensal' }, { id: 'anual', rotulo: 'Análise anual' }, { id: 'analises', rotulo: 'Radar IA' }] },
  { grupo: 'Cadastros', itens: [
    { id: 'contas', rotulo: 'Contas e cartões' }, { id: 'receitas', rotulo: 'Receitas' }, { id: 'custos', rotulo: 'Custos fixos' },
    { id: 'dividas', rotulo: 'Dívidas' }, { id: 'orcamentos', rotulo: 'Orçamentos' }, { id: 'categorias', rotulo: 'Categorias' },
  ] },
  { grupo: 'Sistema', itens: [{ id: 'ajustes', rotulo: 'Ajustes' }] },
]

export default function App() {
  const [pagina, setPagina] = useState<Exclude<Pagina, 'logo'>>('painel')
  const { dados, erro, recarregar } = useDados()

  let corpo: ReactNode = <div className="secao sutil">{erro ?? 'Carregando…'}</div>
  if (dados) {
    const p = { dados, recarregar }
    corpo = {
      painel: <Painel dados={dados} ir={setPagina} />,
      lancamentos: <Lancamentos {...p} />,
      relatorio: <Relatorio dados={dados} />,
      anual: <Anual dados={dados} />,
      analises: <Analises dados={dados} />,
      contas: <Contas {...p} />,
      receitas: <Receitas {...p} />,
      custos: <CustosFixos {...p} />,
      dividas: <Dividas {...p} />,
      orcamentos: <Orcamentos dados={dados} />,
      categorias: <Categorias {...p} />,
      ajustes: <Ajustes />,
    }[pagina]
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="marca"><Icones.logo />POBI</div>
        {MENU.map((g) => (
          <div key={g.grupo}>
            <div className="grupo">{g.grupo}</div>
            {g.itens.map((i) => {
              const Icone = Icones[i.id]
              return (
                <button key={i.id} className={`item ${pagina === i.id ? 'ativo' : ''}`} onClick={() => setPagina(i.id)}>
                  <Icone />{i.rotulo}
                </button>
              )
            })}
          </div>
        ))}
        <div className="sidebar-rodape"><div className="avatar">G</div><div>Gelton<small>banco local</small></div></div>
      </aside>
      <main className="conteudo"><div className="painel" key={pagina}>{corpo}</div></main>
    </div>
  )
}
