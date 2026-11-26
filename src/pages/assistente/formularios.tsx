import { paraCentavos, pctParaTexto, textoParaNumero } from '../../shared/dinheiro'
import type { CamposDivida } from '../../domain/divida/form'
import { totalDoFormulario } from '../../domain/divida/form'
import { SISTEMAS, TIPOS_DIVIDA } from '../../domain/divida/model'
import { taxaAnualDe } from '../../domain/divida/rules'
import type { CamposRecorrente } from '../../shared/recorrente'
import type { Categoria } from '../../domain/categoria/model'
import { AreaTexto, Campo, Data, Moeda, Segmentos, Selecao, Texto } from '../../ui/components/Campos'
import { Dinheiro } from '../../ui/components/Dinheiro'
import type { useForm } from '../../ui/useForm'

type Form<T extends object> = ReturnType<typeof useForm<T>>

const Secao = ({ titulo, dica }: { titulo: string; dica?: string }) => (
  <div className="form-secao"><span>{titulo}</span>{dica && <small>{dica}</small>}</div>
)

/** Campos da dívida. `nova` mostra o bloco de parcelas; na edição aparece a situação. */
export function CamposDividaForm({ f, nova, categorias, destacar = [], foco = nova }: { f: Form<CamposDivida>; nova: boolean; categorias: Categoria[]; destacar?: string[]; foco?: boolean }) {
  const v = f.valores
  const d = (k: keyof CamposDivida) => (destacar.includes(k) ? 'destacado' : undefined)
  const taxa = textoParaNumero(v.taxa)
  const total = totalDoFormulario(v)
  const contratado = paraCentavos(v.contratado)
  return (
    <>
      <Secao titulo="Identificação" />
      <div className={d('nome')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Nome" erro={f.erros.nome}><Texto autoFocus={foco} placeholder="Financiamento do carro, empréstimo…" {...f.campo('nome')} /></Campo></div>
      <div className={d('tipo')}><Campo rotulo="Tipo"><Selecao {...f.campo('tipo')} itens={TIPOS_DIVIDA} vazio="Não informado" /></Campo></div>
      <div className={d('credor')}><Campo rotulo="Credor"><Texto placeholder="Banco, loja ou pessoa" {...f.campo('credor')} /></Campo></div>

      <Secao titulo="Contrato" />
      <div className={d('contratado')}><Campo rotulo="Valor contratado" erro={f.erros.contratado} dica="O que você recebeu ou financiou"><Moeda {...f.campo('contratado')} /></Campo></div>
      <div className={d('data_contratacao')}><Campo rotulo="Data do contrato" erro={f.erros.data_contratacao}><Data {...f.campo('data_contratacao')} /></Campo></div>
      <div className={d('sistema')}><Campo rotulo="Sistema de amortização"><Selecao {...f.campo('sistema')} itens={SISTEMAS} vazio="Não informado" /></Campo></div>
      {!nova && <Campo rotulo="Situação"><Selecao {...f.campo('status')} vazio={null} itens={[{ id: 'ATIVA', nome: 'Ativa' }, { id: 'RENEGOCIADA', nome: 'Renegociada' }, { id: 'QUITADA', nome: 'Quitada' }]} /></Campo>}
      {nova && <Campo rotulo="Categoria"><Selecao {...f.campo('categoria_id')} itens={categorias.filter((k) => k.tipo === 'DESPESA')} /></Campo>}

      {nova && <>
        <Secao titulo="Parcelas" />
        <div style={{ gridColumn: '1 / -1' }}>
          <Segmentos value={v.modo} onChange={(m) => f.setValores((x) => ({ ...x, modo: m as CamposDivida['modo'] }))} itens={[{ id: 'PARCELA', nome: 'Sei o valor da parcela' }, { id: 'TOTAL', nome: 'Sei o total a pagar' }]} />
        </div>
        {v.modo === 'PARCELA'
          ? <div className={d('valor_parcela')}><Campo rotulo="Valor da parcela" erro={f.erros.valor_parcela}><Moeda {...f.campo('valor_parcela')} /></Campo></div>
          : <div className={d('total')}><Campo rotulo="Total a pagar" erro={f.erros.total}><Moeda {...f.campo('total')} /></Campo></div>}
        <div className={d('parcelas')}><Campo rotulo="Nº de parcelas" erro={f.erros.parcelas}><Texto numerico maxLength={3} placeholder="48" {...f.campo('parcelas')} /></Campo></div>
        <div className={d('primeiro')}><Campo rotulo="1ª parcela vence em" erro={f.erros.primeiro}><Data {...f.campo('primeiro')} /></Campo></div>
        <div className={d('parcelas_pagas')}><Campo rotulo="Já pagas" erro={f.erros.parcelas_pagas} dica="Ficam marcadas como pagas"><Texto numerico maxLength={3} placeholder="0" {...f.campo('parcelas_pagas')} /></Campo></div>
        {total ? (
          <div className="form-resumo" style={{ gridColumn: '1 / -1' }}>
            <span>Total a pagar <strong><Dinheiro valor={total} /></strong></span>
            {contratado && total > contratado ? <span>Juros e encargos <strong className="neg-texto"><Dinheiro valor={total - contratado} /></strong></span> : null}
          </div>
        ) : null}
      </>}

      <Secao titulo="Juros" dica="Opcional, mas ajuda a análise" />
      <div className={d('taxa')}><Campo rotulo="Juros ao mês" erro={f.erros.taxa} dica={taxa && !v.taxa_anual ? `≈ ${pctParaTexto(Math.round(taxaAnualDe(taxa) * 100) / 100)}% ao ano` : undefined}><Texto inputMode="decimal" sufixo="% a.m." placeholder="1,99" {...f.campo('taxa')} /></Campo></div>
      <div className={d('taxa_anual')}><Campo rotulo="Juros ao ano" erro={f.erros.taxa_anual}><Texto inputMode="decimal" sufixo="% a.a." {...f.campo('taxa_anual')} /></Campo></div>
      <div className={d('cet')}><Campo rotulo="CET" erro={f.erros.cet} dica="Custo efetivo total"><Texto inputMode="decimal" sufixo="% a.a." {...f.campo('cet')} /></Campo></div>
      <div />
      <div className={d('observacao')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Observações"><AreaTexto linhas={2} placeholder="Garantia, seguro, IOF, multa, carência…" {...f.campo('observacao')} /></Campo></div>
    </>
  )
}

/** Campos de receita (fixa ou variável). */
export function CamposReceitaForm({ f, categorias, contas, destacar = [], foco }: {
  f: Form<CamposRecorrente>; categorias: Categoria[]; contas: { id: number; nome: string }[]; destacar?: string[]; foco?: boolean
}) {
  const v = f.valores
  const variavel = v.tipo_valor === 'VARIAVEL'
  const d = (k: keyof CamposRecorrente) => (destacar.includes(k) ? 'destacado' : undefined)
  return (
    <>
      <div className={d('nome')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Nome" erro={f.erros.nome}><Texto autoFocus={foco} placeholder="Salário, freela, aluguel recebido…" {...f.campo('nome')} /></Campo></div>
      <div className={d('fonte')}><Campo rotulo="Quem paga"><Texto placeholder="Empresa, cliente…" {...f.campo('fonte')} /></Campo></div>
      <div className={d('tipo_valor')}>
        <Campo rotulo="O valor é">
          <Segmentos value={v.tipo_valor ?? 'FIXA'} onChange={(t) => f.setValores((x) => ({ ...x, tipo_valor: t as 'FIXA' | 'VARIAVEL' }))} itens={[{ id: 'FIXA', nome: 'Fixo' }, { id: 'VARIAVEL', nome: 'Variável' }]} />
        </Campo>
      </div>
      <div className={d('valor')}><Campo rotulo={variavel ? 'Média esperada por mês' : 'Valor mensal'} erro={f.erros.valor} dica={variavel ? 'Usada na previsão do mês' : undefined}><Moeda {...f.campo('valor')} /></Campo></div>
      <div className={d('dia')}><Campo rotulo="Dia do recebimento" erro={f.erros.dia}><Texto placeholder="opcional" numerico maxLength={2} {...f.campo('dia')} /></Campo></div>
      {variavel && <>
        <div className={d('valor_min')}><Campo rotulo="Mês fraco (mínimo)" erro={f.erros.valor_min}><Moeda {...f.campo('valor_min')} /></Campo></div>
        <div className={d('valor_max')}><Campo rotulo="Mês bom (máximo)" erro={f.erros.valor_max}><Moeda {...f.campo('valor_max')} /></Campo></div>
      </>}
      <div className={d('inicio')}><Campo rotulo="Início" erro={f.erros.inicio}><Data {...f.campo('inicio')} /></Campo></div>
      <div className={d('fim')}><Campo rotulo="Fim" erro={f.erros.fim} dica="Vazio = sem data para acabar"><Data {...f.campo('fim')} /></Campo></div>
      <Campo rotulo="Categoria"><Selecao {...f.campo('categoria_id')} itens={categorias.filter((k) => k.tipo === 'RECEITA')} /></Campo>
      <Campo rotulo="Cai na conta"><Selecao {...f.campo('conta_id')} itens={contas} /></Campo>
      <div className={d('observacao')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Observações"><AreaTexto linhas={2} placeholder="Comissão, 13º, sazonalidade…" {...f.campo('observacao')} /></Campo></div>
    </>
  )
}
