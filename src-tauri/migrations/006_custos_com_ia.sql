-- Custos fixos também podem ser cadastrados pelo assistente de IA.
ALTER TABLE custos_fixos ADD COLUMN origem TEXT NOT NULL DEFAULT 'MANUAL';

-- conversas_ia passa a aceitar o alvo 'custo' (SQLite não altera CHECK: recria a tabela).
CREATE TABLE conversas_ia_nova (
  id             TEXT    PRIMARY KEY,
  alvo           TEXT    NOT NULL CHECK (alvo IN ('divida','receita','custo')),
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
INSERT INTO conversas_ia_nova SELECT id, alvo, titulo, status, item_id, motor, mensagens_json, campos_json, meta_json, anexos_json, criado_em, atualizado_em FROM conversas_ia;
DROP TABLE conversas_ia;
ALTER TABLE conversas_ia_nova RENAME TO conversas_ia;
CREATE INDEX idx_conversas_ia_alvo ON conversas_ia(alvo, atualizado_em DESC);
