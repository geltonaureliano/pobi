import { useState, type ReactNode } from 'react'
import { Icones } from './ui/icones'
import { useDados } from './ui/useDados'
import { Painel } from './pages/Painel'
import { Lancamentos } from './pages/Lancamentos'
import { Contas } from './pages/Contas'
import { Dividas } from './pages/Dividas'
import { Orcamentos } from './pages/Orcamentos'
import { Analises } from './pages/Analises'
import { Ajustes } from './pages/Ajustes'

type Pagina = 'painel' | 'lancamentos' | 'contas' | 'dividas' | 'orcamentos' | 'analises' | 'ajustes'
const MENU: { grupo: string; itens: { id: Pagina; rotulo: string }[] }[] = [
  { grupo: 'Principal', itens: [{ id: 'painel', rotulo: 'Painel' }, { id: 'lancamentos', rotulo: 'Lançamentos' }, { id: 'analises', rotulo: 'Análises' }] },
  { grupo: 'Cadastros', itens: [{ id: 'contas', rotulo: 'Contas' }, { id: 'dividas', rotulo: 'Dívidas' }, { id: 'orcamentos', rotulo: 'Orçamentos' }] },
  { grupo: 'Sistema', itens: [{ id: 'ajustes', rotulo: 'Ajustes' }] },
]

export default function App() {
  const [pagina, setPagina] = useState<Pagina>('painel')
  const { dados, erro, recarregar } = useDados()

  let corpo: ReactNode = <div className="secao sutil">{erro ?? 'Carregando…'}</div>
  if (dados) {
    const props = { dados, recarregar }
    corpo = {
      painel: <Painel dados={dados} />,
      lancamentos: <Lancamentos {...props} />,
      contas: <Contas {...props} />,
      dividas: <Dividas {...props} />,
      orcamentos: <Orcamentos dados={dados} />,
      analises: <Analises dados={dados} />,
      ajustes: <Ajustes />,
    }[pagina]
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="marca"><Icones.logo />FIANCE</div>
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
      <main className="conteudo"><div className="painel">{corpo}</div></main>
    </div>
  )
}
