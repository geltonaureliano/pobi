# Dívidas e parcelas

- Ao cadastrar, o total é dividido em N parcelas mensais no mesmo dia do primeiro vencimento. Os centavos que sobram da divisão vão para a última parcela.
- **Saldo devedor** = soma nominal das parcelas em aberto. O app não calcula juros presumidos; a taxa mensal é só informativa para a análise.
- Parcela **atrasada**: em aberto e com vencimento antes de hoje.
- Quando a última parcela em aberto é paga, a dívida passa para `QUITADA`.
- **Pagar parcela** registra a data e o valor pago e, se uma conta for escolhida, cria a despesa na conta ligada à parcela (categoria da dívida, ou "Dívidas"). Excluir esse lançamento reabre a parcela.
- Editar a dívida muda nome, credor, taxa e situação. Parcelas em aberto podem ter valor e vencimento ajustados; parcelas pagas não mudam.
- Excluir a dívida apaga as parcelas, mas mantém os lançamentos de pagamento (o dinheiro já saiu da conta).
