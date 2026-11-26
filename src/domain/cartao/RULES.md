# Cartões e faturas

- A fatura é identificada pelo **mês de vencimento**.
- Compra até o dia de fechamento (inclusive) entra na fatura que fecha naquele mês; depois do fechamento, na próxima.
- Quando o dia de vencimento é menor ou igual ao de fechamento (fecha 28, vence 5), a fatura vence no mês seguinte ao fechamento.
- Dias que não existem no mês (31 em fevereiro) viram o último dia do mês.
- Despesas no cartão contam nos gastos do mês **da compra** (para orçamento e categorias), mas só saem do saldo da conta quando a fatura é paga (lançamento de despesa na conta).
- **Pagar fatura** cria uma despesa paga na conta de pagamento, marcada com `fatura_ref = <cartão>:<AAAA-MM>` e sem categoria (os gastos já foram categorizados na compra, então o pagamento não conta duas vezes nos gastos por categoria). Situação: vazia, aberta, parcial ou paga.
- O pagamento da fatura **não entra** nas despesas do mês nem nos totais: é tratado como transferência para o cartão. Ele só reduz o saldo da conta.
- Limite disponível = limite − soma do que está em aberto em todas as faturas.
- Cartão com compras é arquivado em vez de excluído.
