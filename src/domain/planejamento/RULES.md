# Planejamento do mês (regra do app)

- **Receitas** = tudo que está em Receitas, pela regra de cada uma (fixa, variável pela média, por hora pelos dias úteis, avulsa só no mês dela).
- **Despesas** = custos fixos (custo de vida) + faturas de cartão que vencem no mês + parcelas de dívidas do mês.
- **Saldo do mês** = receitas − despesas. "Saldo hoje" conta só o que já caiu ou venceu até o dia; "fecha o mês com" é o mês inteiro. É o saldo mostrado no Dashboard, no Relatório e no rodapé do menu.
- Fatura: vale o valor informado do app do banco; sem ele, a soma das compras lançadas.
- Custo fixo cobrado em cartão entra pela fatura: só conta à parte quando a fatura daquele cartão no mês não foi informada (senão já está dentro dela).
- Lançamentos aparecem como **realizado**, à parte, para comparar com o previsto.
- Dashboard, Relatório mensal, Análise anual e Radar IA usam este cálculo (`planoDoMes`, `saldoDoMes`, `fluxoDoMes`).
