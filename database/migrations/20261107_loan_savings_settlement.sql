-- Record loan settlements made directly from a member's accumulated savings.
-- The amount is stored in deposits so all member saving balances can subtract it.
ALTER TABLE deposits
  DROP CONSTRAINT IF EXISTS deposits_transaction_type_check;

ALTER TABLE deposits
  ADD CONSTRAINT deposits_transaction_type_check
  CHECK (transaction_type IN ('saving', 'extra_saving', 'refund', 'other', 'loan_settlement'));
