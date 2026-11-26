import { useEffect, useRef, useState } from 'react'
import type { Centavos } from '../../shared/dinheiro'

const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const semMovimento = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Anima o número do valor anterior até o novo (contagem rápida, desacelerando no fim). */
function useContagem(alvo: number, ativo: boolean) {
  const [atual, setAtual] = useState(ativo && !semMovimento() ? 0 : alvo)
  const de = useRef(atual)
  useEffect(() => {
    if (!ativo || semMovimento()) { setAtual(alvo); return }
    const inicio = performance.now()
    const origem = de.current
    const duracao = 700
    let quadro = 0
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio) / duracao)
      const v = Math.round(origem + (alvo - origem) * (1 - Math.pow(1 - p, 3)))
      de.current = v
      setAtual(v)
      if (p < 1) quadro = requestAnimationFrame(passo)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [alvo, ativo])
  return atual
}

/**
 * Valor em reais com tipografia própria: "R$" menor, centavos mais leves e números tabulares.
 * `tom="auto"` pinta negativos de vermelho; `pos`/`neg` forçam verde/vermelho.
 * `sinal` mostra + ou − na frente. `animar` faz a contagem até o valor.
 */
export function Dinheiro({ valor, tom = 'auto', sinal, animar, className }: {
  valor: Centavos; tom?: 'auto' | 'pos' | 'neg' | 'neutro'; sinal?: boolean; animar?: boolean; className?: string
}) {
  const v = useContagem(valor, Boolean(animar))
  const negativo = valor < 0
  const [inteiro, centavos] = fmt.format(Math.abs(v) / 100).split(',')
  const cor = tom === 'auto' ? (negativo ? 'neg' : '') : tom === 'neutro' ? '' : tom
  const prefixo = sinal ? (valor > 0 ? '+' : valor < 0 ? '−' : '') : negativo ? '−' : ''
  return (
    <span className={`dinheiro ${cor} ${className ?? ''}`} title={`R$ ${fmt.format(valor / 100)}`}>
      {prefixo && <span className="dinheiro-sinal">{prefixo}</span>}
      <span className="dinheiro-moeda">R$</span>
      <span className="dinheiro-inteiro">{inteiro}</span>
      <span className="dinheiro-centavos">,{centavos}</span>
    </span>
  )
}
