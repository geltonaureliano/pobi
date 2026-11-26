-- Cartões com mais detalhes e cadastro pelo assistente de IA.
ALTER TABLE cartoes ADD COLUMN bandeira TEXT;
ALTER TABLE cartoes ADD COLUMN final TEXT;      -- só os 4 últimos dígitos, nunca o número inteiro
ALTER TABLE cartoes ADD COLUMN emissor TEXT;
ALTER TABLE cartoes ADD COLUMN anuidade INTEGER;
ALTER TABLE cartoes ADD COLUMN observacao TEXT;
ALTER TABLE cartoes ADD COLUMN origem TEXT NOT NULL DEFAULT 'MANUAL';

-- conversas_ia sem CHECK de alvo: novos tipos de cadastro não precisam recriar a tabela.
CREATE TABLE conversas_ia_nova (
  id             TEXT    PRIMARY KEY,
  alvo           TEXT    NOT NULL,
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
