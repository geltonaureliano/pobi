-- Pagamento de fatura: despesa na conta que quita compras do cartão.
-- Não entra nos totais de despesa (as compras já entraram), só no saldo da conta.
ALTER TABLE lancamentos ADD COLUMN fatura_ref TEXT;
CREATE INDEX idx_lancamentos_fatura_ref ON lancamentos(fatura_ref) WHERE fatura_ref IS NOT NULL;

-- Receitas e custos fixos podem ser pausados sem apagar a vigência.
ALTER TABLE receitas ADD COLUMN ativa INTEGER NOT NULL DEFAULT 1;
ALTER TABLE receitas ADD COLUMN observacao TEXT;
ALTER TABLE custos_fixos ADD COLUMN ativo INTEGER NOT NULL DEFAULT 1;
ALTER TABLE custos_fixos ADD COLUMN observacao TEXT;
