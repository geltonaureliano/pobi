-- Fatura informada: o valor de uma fatura (mês de vencimento) quando ele vem do app do banco
-- e não das compras lançadas no Pobi (ex.: parcelas de compras antigas, saldo ao começar a usar o app).
CREATE TABLE faturas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  cartao_id   INTEGER NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
  competencia TEXT    NOT NULL,          -- AAAA-MM do vencimento
  valor       INTEGER NOT NULL CHECK (valor >= 0),
  observacao  TEXT,
  origem      TEXT    NOT NULL DEFAULT 'MANUAL',
  UNIQUE (cartao_id, competencia)
);
