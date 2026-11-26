export function Barra({ rotulo, direita, fracao, estourada }: { rotulo: string; direita: string; fracao: number; estourada?: boolean }) {
  return (
    <div className="barra-linha">
      <div className="barra-rotulo"><span>{rotulo}</span><span className="sutil">{direita}</span></div>
      <div className={`barra ${estourada ? 'estourada' : ''}`}><i style={{ width: `${Math.min(100, Math.max(0, fracao * 100))}%` }} /></div>
    </div>
  )
}
