# Assistente de cadastro (IA local)

- Usado para cadastrar **dívidas** e **receitas**. O usuário escreve e/ou anexa arquivos (contrato, boleto, print, holerite, PDF, planilha, qualquer tipo).
- Roda o CLI de IA da máquina (Claude Code ou Codex, escolhido em Ajustes). Os anexos são gravados numa pasta temporária, a IA só pode **ler** essa pasta e ela é apagada ao fim de cada resposta. Nada vai para servidor do app.
- O CLI não guarda conversa: a cada mensagem enviamos o histórico, o rascunho atual (incluindo correções feitas à mão) e os anexos novos.
- A IA responde um JSON com `resposta` (chat), `resumo`, `confianca`, `pendencias` e `rascunho`. Valores em reais, datas AAAA-MM-DD, taxas em %.
- O rascunho **só preenche o que veio**; campos que a IA devolveu nulos ficam como estavam. O usuário pode editar tudo no painel de revisão antes de confirmar.
- Nada é gravado até o usuário clicar em **Confirmar e cadastrar**. A validação é a mesma do cadastro manual.
- Dívida: com valor de parcela, o total é parcela × quantidade. "Parcelas pagas" marca as primeiras parcelas como pagas na data de vencimento, sem criar lançamentos (o dinheiro saiu antes do app).
- No navegador (`npm run dev`) não há CLI: uma simulação por heurística preenche o rascunho para testar a interface, e a resposta avisa que é demonstração.
