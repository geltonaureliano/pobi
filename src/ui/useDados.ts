import { useCallback, useEffect, useState } from 'react'
import { listarCategorias } from '../domain/categoria/repository'
import type { Categoria } from '../domain/categoria/model'
import { listarContas } from '../domain/conta/repository'
import type { ContaComSaldo } from '../domain/conta/model'
import { comSaldos } from '../domain/conta/rules'
import { listarCartoesTodos, listarFaturas } from '../domain/cartao/repository'
import type { Cartao, FaturaInformada } from '../domain/cartao/model'
import { todosLancamentos } from '../domain/lancamento/repository'
import type { LancamentoDetalhado } from '../domain/lancamento/model'
import { listarDividas, listarParcelas } from '../domain/divida/repository'
import type { Divida, Parcela } from '../domain/divida/model'
import type { Receita } from '../domain/receita/model'
import { listarReceitas } from '../domain/receita/repository'
import { listarCustosFixos } from '../domain/custo-fixo/repository'
import type { CustoFixo } from '../domain/custo-fixo/model'

export interface Dados {
  lancamentos: LancamentoDetalhado[]
  contas: ContaComSaldo[]
  categorias: Categoria[]
  cartoes: Cartao[]
  dividas: Divida[]
  parcelas: Parcela[]
  receitas: Receita[]
  custosFixos: CustoFixo[]
  /** Valores de fatura informados (app do banco). */
  faturas: FaturaInformada[]
}

/** Carrega tudo de uma vez. Para uso pessoal (milhares de lançamentos) isso é instantâneo no SQLite. */
export function useDados() {
  const [dados, setDados] = useState<Dados | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const recarregar = useCallback(async () => {
    try {
      const [lancamentos, contas, categorias, cartoes, dividas, parcelas, receitas, custosFixos, faturas] = await Promise.all([
        todosLancamentos(), listarContas(), listarCategorias(), listarCartoesTodos(), listarDividas(), listarParcelas(),
        listarReceitas(), listarCustosFixos(), listarFaturas(),
      ])
      setDados({ lancamentos, contas: comSaldos(contas, lancamentos), categorias, cartoes, dividas, parcelas, receitas, custosFixos, faturas })
    } catch (e) {
      setErro(String(e))
    }
  }, [])
  useEffect(() => { recarregar() }, [recarregar])
  return { dados, erro, recarregar }
}
