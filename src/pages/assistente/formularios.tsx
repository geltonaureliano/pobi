import { paraCentavos, pctParaTexto, textoParaNumero } from '../../shared/dinheiro'
import type { CamposDivida } from '../../domain/divida/form'
import { totalDoFormulario } from '../../domain/divida/form'
import { SISTEMAS, TIPOS_DIVIDA } from '../../domain/divida/model'
import { taxaAnualDe } from '../../domain/divida/rules'
import { parametrosPorHora, type CamposReceita } from '../../domain/receita/form'
import type { CamposCusto } from '../../domain/custo-fixo/form'
import { previsaoDaReceita } from '../../domain/receita/rules'
import { competenciaDe, deslocarCompetencia, hoje, rotuloCompetencia } from '../../shared/data'
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

/** Campos de receita: fixa, variável (média e faixa) ou por hora (calculada mês a mês). */
export function CamposReceitaForm({ f, categorias, contas, destacar = [], foco }: {
  f: Form<CamposReceita>; categorias: Categoria[]; contas: { id: number; nome: string }[]; destacar?: string[]; foco?: boolean
}) {
  const v = f.valores
  const d = (k: keyof CamposReceita) => (destacar.includes(k) ? 'destacado' : undefined)
  const ph = v.regra === 'HORAS' ? parametrosPorHora(v) : null
  const c0 = competenciaDe(hoje())
  const exemplos = ph ? [0, 1, 2].map((i) => {
    const c = deslocarCompetencia(c0, i)
    return { c, p: previsaoDaReceita({ valor: 1, inicio: '0000-01-01', fim: null, regra: 'HORAS', ...ph }, c)! }
  }) : []
  return (
    <>
      <div className={d('nome')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Nome" erro={f.erros.nome}><Texto autoFocus={foco} placeholder="Salário, freela, aluguel recebido…" {...f.campo('nome')} /></Campo></div>
      <div className={d('fonte')}><Campo rotulo="Quem paga"><Texto placeholder="Empresa, cliente…" {...f.campo('fonte')} /></Campo></div>
      {v.regra === 'AVULSA'
        ? <div className={d('inicio')}><Campo rotulo="Cai em" erro={f.erros.inicio} dica="Data do recebimento único"><Data {...f.campo('inicio')} /></Campo></div>
        : <div className={d('dia')}><Campo rotulo="Dia que cai" erro={f.erros.dia} dica="Vazio = último dia do mês"><Texto placeholder="10" numerico maxLength={2} {...f.campo('dia')} /></Campo></div>}
      <div className={d('regra')} style={{ gridColumn: '1 / -1' }}>
        <Campo rotulo="Como o valor é definido">
          <Segmentos value={v.regra} onChange={(t) => f.setValores((x) => ({ ...x, regra: t as CamposReceita['regra'] }))}
            itens={[{ id: 'FIXA', nome: 'Fixo todo mês' }, { id: 'VARIAVEL', nome: 'Variável (média)' }, { id: 'HORAS', nome: 'Por hora' }, { id: 'AVULSA', nome: 'Avulso (uma vez)' }]} />
        </Campo>
      </div>
      {v.regra !== 'HORAS' && <div className={d('valor')}><Campo rotulo={v.regra === 'VARIAVEL' ? 'Média esperada por mês' : v.regra === 'AVULSA' ? 'Valor que vai cair' : 'Valor mensal'} erro={f.erros.valor} dica={v.regra === 'VARIAVEL' ? 'Usada na previsão do mês' : undefined}><Moeda {...f.campo('valor')} /></Campo></div>}
      {v.regra === 'VARIAVEL' && <>
        <div />
        <div className={d('valor_min')}><Campo rotulo="Mês fraco (mínimo)" erro={f.erros.valor_min}><Moeda {...f.campo('valor_min')} /></Campo></div>
        <div className={d('valor_max')}><Campo rotulo="Mês bom (máximo)" erro={f.erros.valor_max}><Moeda {...f.campo('valor_max')} /></Campo></div>
      </>}
      {v.regra === 'HORAS' && <>
        <div className={d('valor_hora')}><Campo rotulo="Valor da hora (bruto)" erro={f.erros.valor_hora}><Moeda {...f.campo('valor_hora')} /></Campo></div>
        <div className={d('horas_dia')}><Campo rotulo="Horas por dia útil" erro={f.erros.horas_dia}><Texto inputMode="decimal" sufixo="h/dia" {...f.campo('horas_dia')} /></Campo></div>
        <div className={d('desconto_pct')}><Campo rotulo="Desconto até cair na conta" erro={f.erros.desconto_pct} dica="Retenções, taxas: bruto → líquido"><Texto inputMode="decimal" sufixo="%" placeholder="0" {...f.campo('desconto_pct')} /></Campo></div>
        <div className={d('defasagem')}><Campo rotulo="O pagamento é pelo trabalho de">
          <Selecao {...f.campo('defasagem')} vazio={null} itens={[{ id: '1', nome: 'Mês anterior', dica: 'NF no mês seguinte' }, { id: '0', nome: 'Mesmo mês' }, { id: '2', nome: 'Dois meses antes' }]} />
        </Campo></div>
        <div className="previsao-horas" style={{ gridColumn: '1 / -1' }}>
          <span className="campo-rotulo">Como vai ficar</span>
          {ph ? exemplos.map(({ c, p }) => (
            <div key={c} className="previsao-linha">
              <strong>{rotuloCompetencia(c)}</strong>
              <span>{p.horas!.dias} dias úteis de {rotuloCompetencia(p.horas!.referencia).toLowerCase()} × {pctParaTexto(ph.horas_dia)}h{p.horas!.descontoPct ? ` − ${pctParaTexto(p.horas!.descontoPct)}%` : ''}</span>
              <Dinheiro valor={p.valor} tom="pos" />
            </div>
          )) : <p className="sutil" style={{ margin: 0 }}>Preencha o valor da hora e as horas por dia para ver os próximos meses.</p>}
          <small className="sutil">Dias úteis = segunda a sexta, sem feriados nacionais. Dá para ajustar os dias de um mês específico na tela de Receitas.</small>
        </div>
      </>}
      {v.regra !== 'AVULSA' && <>
        <div className={d('inicio')}><Campo rotulo="Recebe a partir de" erro={f.erros.inicio}><Data {...f.campo('inicio')} /></Campo></div>
        <div className={d('fim')}><Campo rotulo="Até" erro={f.erros.fim} dica="Vazio = sem data para acabar"><Data {...f.campo('fim')} /></Campo></div>
      </>}
      <Campo rotulo="Categoria"><Selecao {...f.campo('categoria_id')} itens={categorias.filter((k) => k.tipo === 'RECEITA')} /></Campo>
      <Campo rotulo="Cai na conta"><Selecao {...f.campo('conta_id')} itens={contas} /></Campo>
      <div className={d('observacao')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Observações"><AreaTexto linhas={2} placeholder="Comissão, 13º, sazonalidade…" {...f.campo('observacao')} /></Campo></div>
    </>
  )
}

/** Campos de custo fixo: um registro de despesa mensal (valor, dia, categoria e de onde sai). */
export function CamposCustoForm({ f, categorias, contas, cartoes, destacar = [], foco }: {
  f: Form<CamposCusto>; categorias: Categoria[]; contas: { id: number; nome: string }[]; cartoes: { id: number; nome: string }[]; destacar?: string[]; foco?: boolean
}) {
  const v = f.valores
  const d = (k: keyof CamposCusto) => (destacar.includes(k) ? 'destacado' : undefined)
  const deCartao = !!v.cartao_id
  return (
    <>
      <div className={d('nome')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Nome" erro={f.erros.nome}><Texto autoFocus={foco} placeholder="Aluguel, internet, academia…" {...f.campo('nome')} /></Campo></div>
      <div className={d('valor')}><Campo rotulo="Valor mensal" erro={f.erros.valor}><Moeda {...f.campo('valor')} /></Campo></div>
      <div className={d('dia')}><Campo rotulo="Vence todo dia" erro={f.erros.dia} dica="Vazio = último dia do mês"><Texto placeholder="5" numerico maxLength={2} {...f.campo('dia')} /></Campo></div>
      <div className={d('categoria_id') ?? d('categoria_nova')} style={{ gridColumn: '1 / -1' }}>
        <Campo rotulo="Categoria">
          {v.categoria_nova && !v.categoria_id ? (
            <div className="categoria-nova">
              <span className="tag laranja">nova</span>
              <strong>{v.categoria_nova}</strong>
              <span className="sutil">será criada ao salvar</span>
              <button type="button" className="aba" onClick={() => f.setValores((x) => ({ ...x, categoria_nova: '' }))}>escolher outra</button>
            </div>
          ) : (
            <Selecao {...f.campo('categoria_id')} itens={categorias.filter((k) => k.tipo === 'DESPESA')} vazio="Sem categoria" />
          )}
        </Campo>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <Campo rotulo="Sai de">
          <Segmentos value={deCartao ? 'CARTAO' : 'CONTA'} onChange={(m) => f.setValores((x) => m === 'CARTAO'
            ? { ...x, conta_id: '', cartao_id: x.cartao_id || String(cartoes[0]?.id ?? '') }
            : { ...x, cartao_id: '', conta_id: x.conta_id || String(contas[0]?.id ?? '') })}
            itens={[{ id: 'CONTA', nome: 'Conta' }, { id: 'CARTAO', nome: 'Cartão de crédito' }]} />
        </Campo>
      </div>
      {deCartao
        ? <div className={d('cartao_id')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Cartão" erro={f.erros.cartao_id}><Selecao {...f.campo('cartao_id')} itens={cartoes} vazio={null} /></Campo></div>
        : <div className={d('conta_id')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Conta"><Selecao {...f.campo('conta_id')} itens={contas} /></Campo></div>}
      <div className={d('inicio')}><Campo rotulo="A partir de" erro={f.erros.inicio}><Data {...f.campo('inicio')} /></Campo></div>
      <div className={d('fim')}><Campo rotulo="Até" erro={f.erros.fim} dica="Vazio = sem data para acabar"><Data {...f.campo('fim')} /></Campo></div>
      <div className={d('observacao')} style={{ gridColumn: '1 / -1' }}><Campo rotulo="Observações"><AreaTexto linhas={2} placeholder="Reajuste anual, fidelidade, multa…" {...f.campo('observacao')} /></Campo></div>
    </>
  )
}
