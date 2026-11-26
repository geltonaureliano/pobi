-- Regra de cálculo da receita: FIXA (mesmo valor), VARIAVEL (média com faixa) ou HORAS
-- (dias úteis do mês de referência × horas por dia × valor da hora, menos o desconto).
ALTER TABLE receitas ADD COLUMN regra TEXT NOT NULL DEFAULT 'FIXA';
ALTER TABLE receitas ADD COLUMN valor_hora INTEGER;
ALTER TABLE receitas ADD COLUMN horas_dia REAL;
ALTER TABLE receitas ADD COLUMN desconto_pct REAL;
-- Quantos meses antes do recebimento está o trabalho pago (1 = paga no mês seguinte).
ALTER TABLE receitas ADD COLUMN defasagem_meses INTEGER NOT NULL DEFAULT 1;
UPDATE receitas SET regra = tipo_valor WHERE tipo_valor IN ('FIXA', 'VARIAVEL');

-- Ajuste de um mês específico: dias trabalhados diferentes ou valor já conhecido.
CREATE TABLE receitas_mes (
  receita_id  INTEGER NOT NULL REFERENCES receitas(id) ON DELETE CASCADE,
  competencia TEXT    NOT NULL,
  dias        INTEGER,
  valor       INTEGER,
  observacao  TEXT,
  PRIMARY KEY (receita_id, competencia)
);
