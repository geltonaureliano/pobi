# Receitas recorrentes

- Cadastro do que se espera receber (salário, freelas, renda por hora). O dinheiro que de fato entra é lançado em Lançamentos.
- Ativa numa competência se a vigência (`inicio` até `fim`, ou sem fim) cruza aquele mês.
- **Receita prevista** do mês = soma das receitas ativas. Sem dia de recebimento, assume-se o último dia do mês.
- Uma receita pode ser **pausada** sem mexer na vigência; pausada, não entra na previsão.
- Receita é **o que se espera receber**: não há registro de recebimento aqui. A tela mostra a previsão mês a mês.
- Regras de valor:
  - **Fixa**: o mesmo valor todo mês.
  - **Variável**: a média esperada, com faixa opcional (mínimo e máximo).
  - **Por hora**: dias úteis do mês trabalhado × horas por dia × valor da hora, menos o desconto % (retenções/taxas entre o bruto e o que cai). O mês trabalhado é o do recebimento menos a defasagem (1 = paga no mês seguinte, como NF emitida no início do mês).
- Dias úteis: segunda a sexta, sem feriados nacionais (inclui Sexta-feira Santa e Consciência Negra; Carnaval e Corpus Christi são pontos facultativos e não descontam).
- A previsão é sempre calculada pela regra (sem ajuste manual por mês). Na regra por hora a tela mostra bruto, taxas (o desconto %) e o líquido previsto.
- Editar uma receita abre o assistente com o chat ligado a ela; pausar e excluir ficam lá.
