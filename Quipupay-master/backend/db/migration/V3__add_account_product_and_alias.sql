-- HU03: la apertura de cuenta necesita distinguir el producto contratado
-- (para la regla "maximo 3 cuentas del mismo tipo") y un alias opcional.

ALTER TABLE banking.accounts
  ADD COLUMN product_code varchar(40) NOT NULL DEFAULT 'AHORROS',
  ADD COLUMN alias varchar(120);

CREATE INDEX idx_accounts_user_product ON banking.accounts(user_id, product_code);
