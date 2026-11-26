-- Conversas com o assistente de IA: salvas a cada mensagem, viram rascunho até confirmar o cadastro.
CREATE TABLE conversas_ia (
  id             TEXT    PRIMARY KEY,
  alvo           TEXT    NOT NULL CHECK (alvo IN ('divida','receita')),
  titulo         TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO','CONCLUIDA')),
  item_id        INTEGER,
  motor          TEXT,
  mensagens_json TEXT    NOT NULL DEFAULT '[]',
  campos_json    TEXT    NOT NULL DEFAULT '{}',
  meta_json      TEXT,
  anexos_json    TEXT    NOT NULL DEFAULT '[]',
  criado_em      TEXT    NOT NULL DEFAULT (datetime('now')),
  atualizado_em  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_conversas_ia_alvo ON conversas_ia(alvo, atualizado_em DESC);
