# Dívidas e parcelas

- Ao cadastrar, o total é dividido em N parcelas mensais no mesmo dia do primeiro vencimento. Os centavos que sobram da divisão vão para a última parcela.
- **Saldo devedor** = soma nominal das parcelas em aberto. O app não calcula juros presumidos; a taxa mensal é só informativa para a análise.
- Parcela **atrasada**: em aberto e com vencimento antes de hoje.
- Quando a última parcela em aberto é paga, a dívida passa para `QUITADA`.
