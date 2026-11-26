# Lançamentos

Um lançamento é uma receita, uma despesa ou uma transferência entre contas.

- Valores sempre positivos, em centavos. O tipo define o sinal.
- Precisa de uma conta ou de um cartão. Transferência precisa de origem e destino diferentes e não tem categoria nem cartão.
- Receita não pode ser lançada em cartão.
- **Totais** (receitas, despesas, categorias, heatmap) consideram só lançamentos `PAGO`. Transferências, cancelados e pagamentos de fatura nunca entram (as compras do cartão já foram contadas). Pendentes servem para projeção.
- **Saldo da conta**: receitas pagas somam, despesas pagas subtraem, transferência sai da origem e entra no destino. Lançamentos de cartão não mexem no saldo da conta; quem mexe é o pagamento da fatura.
- A competência é o mês da data do lançamento (data de calendário, sem fuso).

## Importação CSV

- Detecta separador (`;` ou `,`) e as colunas pelo cabeçalho: data, descrição/histórico, valor.
- Valor negativo vira despesa, positivo vira receita.
- Cada linha ganha um `id_externo` estável (conta, data, valor, descrição e ocorrência). Reimportar o mesmo arquivo não duplica nada.
- Linhas com data ou valor inválido são listadas como ignoradas, nunca viram zero.
