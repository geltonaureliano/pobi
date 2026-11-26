import marca from '../../../assets/branding/logos/pobi.svg'
import marcaInversa from '../../../assets/branding/logos/pobi-inverse.svg'
import simbolo from '../../../assets/branding/logos/symbol.svg'

/** Assinatura "pobi" (o porquinho mora no o). Use `inversa` em fundo escuro, como a sidebar. */
export function Marca({ inversa, altura = 28, decorativa }: { inversa?: boolean; altura?: number; decorativa?: boolean }) {
  return <img src={inversa ? marcaInversa : marca} height={altura} width={(altura * 276) / 112} alt={decorativa ? '' : 'pobi'} className="marca-img" draggable={false} />
}

/** Só o porquinho. Decorativo: quem o envolve dá o nome acessível. */
export function Simbolo({ tamanho = 24 }: { tamanho?: number }) {
  return <img src={simbolo} width={tamanho} height={tamanho} alt="" className="simbolo-img" draggable={false} />
}
