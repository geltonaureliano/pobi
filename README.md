# Pobi

App desktop de finanças pessoais. Banco SQLite local, visual próprio (Azeret Mono, laranja/creme/escuro) e análises por IA usando o **CLI do Claude Code ou do Codex** já instalado na máquina, sem chave de API.

## Rodar

Pré-requisitos (no Mac): Node 20+, Rust e as ferramentas do Tauri 2 (Xcode Command Line Tools).

```sh
npm install
npm run app        # abre o app desktop (Tauri) com o banco real
npm run dev        # só a interface no navegador, com banco em memória e dados de exemplo
npm test           # testes das regras de negócio
npm run tauri build  # gera o .app / .dmg
npm run install-app  # gera o build, instala em /Applications/Pobi.app e fixa no Dock
```

Depois de qualquer mudança, rode `npm run install-app` para atualizar o Pobi do Dock. O script puxa a main (se não houver mudanças locais), gera o build, fecha o app aberto, troca o `/Applications/Pobi.app` e abre de novo. Os dados ficam no banco e não são apagados.

O banco fica em `~/Library/Application Support/com.gelton.pobi/financas.db`.

## Organização: uma pasta por entidade

```
src/domain/<entidade>/
  model.ts       tipos
  rules.ts       regras de negócio puras (sem banco), testadas
  repository.ts  SQL da entidade
  form.ts        validação do formulário (quando há)
  RULES.md       as regras em português, com hipóteses e limites
  *.test.ts      testes das regras
```

Entidades: `conta`, `categoria`, `lancamento` (com importação CSV), `cartao` (faturas e pagamento), `receita`, `custo-fixo` (geração do mês), `divida` (parcelas), `orcamento`, `painel` (métricas do dashboard), `relatorio` (relatório mensal com score de saúde e série anual) e `analise` (Radar IA).

## Telas

| Grupo | Tela | O que faz |
|---|---|---|
| Principal | Painel | saldo, receitas, despesas, poupança, heatmap de gastos, orçamentos, maiores categorias |
| | Lançamentos | lista do mês com busca e filtros, criar/editar/excluir, pendentes, importação CSV |
| Análise | Relatório mensal | score de saúde 0–100, comprometimento, essenciais × não essenciais, compromissos, reserva de emergência, fontes de renda, movimento por conta |
| | Análise anual | receitas × despesas por mês, saldo acumulado, tabela do ano e categorias mês a mês |
| | Radar IA | análise do mês pelo Claude Code ou Codex, com insights, plano e pontos cegos |
| Cadastros | Contas e cartões | contas (principal, arquivar), cartões com limite, faturas e pagamento |
| | Receitas | fontes recorrentes, pausar, registrar recebimento |
| | Custos fixos | situação no mês (pago/pendente/não lançado), gerar lançamentos do mês |
| | Dívidas | parcelas, pagar (lança na conta), ajustar parcela |
| | Orçamentos | limite por categoria/mês, copiar do mês anterior |
| | Categorias | cor, essencial, proteção contra excluir categoria em uso |

Outras pastas:
- `src/shared/` dinheiro em centavos e datas de calendário.
- `src/db/` cliente do SQLite (Tauri no app, sql.js no navegador) e dados de exemplo do modo navegador.
- `src/ui/` tema, layout e componentes visuais. `src/pages/` as telas.
- `src-tauri/` app nativo: migrações SQL (`migrations/`) e o comando que executa o CLI de IA (`src/ai.rs`).

## Análises por IA

A tela **Análises** monta um resumo agregado do mês (nada de extrato completo), envia ao `claude -p` ou ao `codex exec` e mostra manchete, insights com evidência numérica, plano e pontos cegos. Detalhes em `src/domain/analise/RULES.md`. O motor é escolhido em **Ajustes**.

## Convenções

- Dinheiro sempre em centavos inteiros. Datas como texto `AAAA-MM-DD`; competência como `AAAA-MM`.
- Regra nova entra em `rules.ts` com teste e é descrita no `RULES.md` da entidade.
- Mudança de banco é uma nova migração em `src-tauri/migrations/` registrada em `src-tauri/src/lib.rs`; nunca editar uma migração já publicada.

## Commits

O histórico segue [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, com escopo opcional da entidade (ex.: `feat(divida): ...`).
