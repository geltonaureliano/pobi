-- Valores monetários sempre em centavos (INTEGER). Datas como texto ISO (YYYY-MM-DD).
PRAGMA foreign_keys = ON;

CREATE TABLE contas (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  nome            TEXT    NOT NULL,
  tipo            TEXT    NOT NULL CHECK (tipo IN ('CORRENTE','POUPANCA','INVESTIMENTO','CARTEIRA')),
  saldo_inicial   INTEGER NOT NULL DEFAULT 0,
  principal       INTEGER NOT NULL DEFAULT 0,
  arquivada       INTEGER NOT NULL DEFAULT 0,
  criado_em       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE categorias (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  nome      TEXT NOT NULL,
  tipo      TEXT NOT NULL CHECK (tipo IN ('RECEITA','DESPESA')),
  cor       TEXT,
  essencial INTEGER NOT NULL DEFAULT 0,
  UNIQUE (nome, tipo)
);

CREATE TABLE cartoes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  nome             TEXT    NOT NULL,
  limite           INTEGER NOT NULL DEFAULT 0,
  dia_fechamento   INTEGER NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
  dia_vencimento   INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
  conta_pagamento_id INTEGER REFERENCES contas(id),
  arquivado        INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE lancamentos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  descricao     TEXT    NOT NULL,
  valor         INTEGER NOT NULL CHECK (valor > 0),
  tipo          TEXT    NOT NULL CHECK (tipo IN ('RECEITA','DESPESA','TRANSFERENCIA')),
  status        TEXT    NOT NULL DEFAULT 'PAGO' CHECK (status IN ('PAGO','PENDENTE','CANCELADO')),
  data          TEXT    NOT NULL,
  conta_id      INTEGER REFERENCES contas(id),
  conta_destino_id INTEGER REFERENCES contas(id),
  cartao_id     INTEGER REFERENCES cartoes(id),
  categoria_id  INTEGER REFERENCES categorias(id),
  parcela_id    INTEGER REFERENCES parcelas(id),
  origem        TEXT    NOT NULL DEFAULT 'MANUAL' CHECK (origem IN ('MANUAL','IMPORTACAO','RECORRENTE')),
  id_externo    TEXT,
  observacao    TEXT,
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (conta_id IS NOT NULL OR cartao_id IS NOT NULL)
);
CREATE INDEX idx_lancamentos_data ON lancamentos(data);
CREATE UNIQUE INDEX idx_lancamentos_externo ON lancamentos(id_externo) WHERE id_externo IS NOT NULL;

CREATE TABLE receitas (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  nome         TEXT    NOT NULL,
  valor        INTEGER NOT NULL CHECK (valor > 0),
  dia_recebimento INTEGER CHECK (dia_recebimento BETWEEN 1 AND 31),
  inicio       TEXT    NOT NULL,
  fim          TEXT,
  conta_id     INTEGER REFERENCES contas(id),
  categoria_id INTEGER REFERENCES categorias(id)
);

CREATE TABLE custos_fixos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT    NOT NULL,
  valor         INTEGER NOT NULL CHECK (valor > 0),
  dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31),
  inicio        TEXT    NOT NULL,
  fim           TEXT,
  conta_id      INTEGER REFERENCES contas(id),
  cartao_id     INTEGER REFERENCES cartoes(id),
  categoria_id  INTEGER REFERENCES categorias(id)
);

CREATE TABLE dividas (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nome          TEXT    NOT NULL,
  credor        TEXT,
  valor_total   INTEGER NOT NULL CHECK (valor_total > 0),
  taxa_mensal   REAL,
  status        TEXT    NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA','QUITADA','RENEGOCIADA')),
  categoria_id  INTEGER REFERENCES categorias(id),
  criado_em     TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE parcelas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  divida_id   INTEGER NOT NULL REFERENCES dividas(id) ON DELETE CASCADE,
  numero      INTEGER NOT NULL,
  valor       INTEGER NOT NULL CHECK (valor > 0),
  vencimento  TEXT    NOT NULL,
  pago_em     TEXT,
  valor_pago  INTEGER,
  UNIQUE (divida_id, numero)
);

CREATE TABLE orcamentos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id  INTEGER NOT NULL REFERENCES categorias(id),
  competencia   TEXT    NOT NULL, -- YYYY-MM
  limite        INTEGER NOT NULL CHECK (limite > 0),
  UNIQUE (categoria_id, competencia)
);

CREATE TABLE analises (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  competencia  TEXT NOT NULL,
  motor        TEXT NOT NULL CHECK (motor IN ('claude','codex')),
  impressao    TEXT NOT NULL, -- hash do resumo enviado, evita reanalisar dados idênticos
  resumo_json  TEXT NOT NULL,
  resultado_json TEXT NOT NULL,
  criado_em    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_analises_competencia ON analises(competencia);

CREATE TABLE ajustes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

INSERT INTO categorias (nome, tipo, essencial) VALUES
  ('Salário','RECEITA',0), ('Freelance','RECEITA',0), ('Outras receitas','RECEITA',0),
  ('Moradia','DESPESA',1), ('Mercado','DESPESA',1), ('Transporte','DESPESA',1), ('Saúde','DESPESA',1),
  ('Contas da casa','DESPESA',1), ('Educação','DESPESA',1), ('Restaurantes','DESPESA',0),
  ('Lazer','DESPESA',0), ('Assinaturas','DESPESA',0), ('Compras','DESPESA',0), ('Dívidas','DESPESA',1),
  ('Outras despesas','DESPESA',0);
