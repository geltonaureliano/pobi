# Análises por IA

O app não tem chave de API. Ele usa o CLI que já está instalado na máquina:

- **Claude Code**: `claude -p --output-format text`, prompt pela entrada padrão.
- **Codex**: `codex exec --sandbox read-only --skip-git-repo-check -`, prompt pela entrada padrão.

O binário é procurado pelo shell de login do usuário (apps do macOS não herdam o PATH do terminal). Em Ajustes dá para escolher o motor; o app mostra quais estão instalados.

## O que é enviado

Só dados **agregados** do mês e dos dois anteriores (`ResumoFinanceiro`): totais por mês, gasto por categoria (com o mês anterior), orçamentos, receita prevista, custos fixos pagos/em aberto, saldo devedor e parcelas, e os 5 maiores gastos do mês (descrição, categoria e valor). Nenhum extrato completo, número de conta ou cartão.

## O que se espera de volta

JSON com `manchete`, `resumo`, `insights` (cada um com severidade e a **evidência** numérica do resumo), `plano` (ações da semana/mês) e `pontosCegos`. Itens fora do formato são descartados; resposta sem manchete ou resumo é rejeitada com erro legível, nunca vira análise vazia.

## Cache

Cada resumo tem uma impressão SHA-256. Se os dados não mudaram desde a última análise com o mesmo motor, o resultado salvo é reaproveitado sem chamar a IA de novo (há um botão para forçar).
