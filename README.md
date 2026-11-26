# Fiance

App desktop de finanças pessoais. Banco SQLite local, visual próprio (Azeret Mono, laranja/creme/escuro) e análises por IA usando o **CLI do Claude Code ou do Codex** já instalado na máquina, sem chave de API.

## Rodar

Pré-requisitos (no Mac): Node 20+, Rust e as ferramentas do Tauri 2 (Xcode Command Line Tools).

```sh
npm install
npm run app        # abre o app desktop (Tauri) com o banco real
npm run dev        # só a interface no navegador, com banco em memória e dados de exemplo
npm test           # testes das regras de negócio
npm run tauri build  # gera o .app / .dmg
```

O banco fica em `~/Library/Application Support/com.gelton.fiance/financas.db`.

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

Entidades: `conta`, `categoria`, `lancamento` (com importação CSV), `cartao` (faturas), `receita`, `custo-fixo`, `divida` (parcelas), `orcamento`, `painel` (métricas do dashboard) e `analise` (IA).

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
