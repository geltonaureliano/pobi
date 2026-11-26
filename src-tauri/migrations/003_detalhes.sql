-- Dívidas com mais detalhe (contrato, juros, sistema de amortização).
ALTER TABLE dividas ADD COLUMN tipo TEXT;
ALTER TABLE dividas ADD COLUMN valor_contratado INTEGER;
ALTER TABLE dividas ADD COLUMN taxa_anual REAL;
ALTER TABLE dividas ADD COLUMN cet_anual REAL;
ALTER TABLE dividas ADD COLUMN sistema TEXT;
ALTER TABLE dividas ADD COLUMN data_contratacao TEXT;
ALTER TABLE dividas ADD COLUMN observacao TEXT;
ALTER TABLE dividas ADD COLUMN origem TEXT NOT NULL DEFAULT 'MANUAL';

-- Receitas fixas ou variáveis (com faixa de mínimo e máximo) e fonte pagadora.
ALTER TABLE receitas ADD COLUMN tipo_valor TEXT NOT NULL DEFAULT 'FIXA';
ALTER TABLE receitas ADD COLUMN valor_min INTEGER;
ALTER TABLE receitas ADD COLUMN valor_max INTEGER;
ALTER TABLE receitas ADD COLUMN fonte TEXT;
ALTER TABLE receitas ADD COLUMN origem TEXT NOT NULL DEFAULT 'MANUAL';
