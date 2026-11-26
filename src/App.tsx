import { useState, type ReactNode } from 'react'
import { Icones } from './ui/icones'
import { useDados } from './ui/useDados'
import { Marca } from './ui/components/Marca'
import { BarraTitulo } from './ui/components/BarraTitulo'
import { Perfil } from './ui/components/Perfil'
import { Toaster } from './ui/components/Toaster'
import { Painel } from './pages/Painel'
import { Lancamentos } from './pages/Lancamentos'
import { Contas } from './pages/Contas'
import { Cartoes } from './pages/Cartoes'
import { CustosFixos } from './pages/Recorrentes'
import { Receitas } from './pages/Receitas'
import { Dividas } from './pages/Dividas'
import { Categorias } from './pages/Categorias'
import { Relatorio } from './pages/Relatorio'
import { Anual } from './pages/Anual'
import { Analises } from './pages/Analises'
import { Ajustes } from './pages/Ajustes'

type Pagina = Exclude<keyof typeof Icones & string, 'orcamentos'>
const MENU: { grupo: string; itens: { id: Pagina; rotulo: string }[] }[] = [
  { grupo: 'Principal', itens: [{ id: 'painel', rotulo: 'Dashboard' }, { id: 'lancamentos', rotulo: 'Lançamentos' }] },
  { grupo: 'Cadastros', itens: [
    { id: 'contas', rotulo: 'Contas' }, { id: 'cartoes', rotulo: 'Cartões' }, { id: 'receitas', rotulo: 'Receitas' },
    { id: 'custos', rotulo: 'Custos fixos' }, { id: 'dividas', rotulo: 'Dívidas' }, { id: 'categorias', rotulo: 'Categorias' },
  ] },
  { grupo: 'Análise', itens: [{ id: 'relatorio', rotulo: 'Relatório mensal' }, { id: 'anual', rotulo: 'Análise anual' }, { id: 'analises', rotulo: 'Radar IA' }] },
  { grupo: 'Sistema', itens: [{ id: 'ajustes', rotulo: 'Ajustes' }] },
]

export default function App() {
  const [pagina, setPagina] = useState<Pagina>('painel')
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
      cartoes: <Cartoes {...p} />,
      receitas: <Receitas {...p} />,
      custos: <CustosFixos {...p} />,
      dividas: <Dividas {...p} />,
      categorias: <Categorias {...p} />,
      ajustes: <Ajustes />,
    }[pagina]
  }

  return (
    <div className="janela">
      <BarraTitulo recarregar={recarregar} />
      <div className="shell">
      <aside className="sidebar">
        <div className="marca"><Marca inversa altura={30} /></div>
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
        <Perfil dados={dados} />
      </aside>
      <main className="conteudo"><div className="painel" key={pagina}>{corpo}</div></main>
      </div>
      <Toaster />
    </div>
  )
}
