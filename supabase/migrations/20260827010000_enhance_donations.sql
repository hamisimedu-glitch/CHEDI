-- Store the donor and payment preferences needed for a payment-ready donation flow.

ALTER TABLE public.donations
  ADD COLUMN IF NOT EXISTS donor_name text,
  ADD COLUMN IF NOT EXISTS donor_phone text,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'mpesa'
    CHECK (payment_method IN ('mpesa', 'card', 'bank_transfer')),
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'one_time'
    CHECK (frequency IN ('one_time', 'monthly')),
  ADD COLUMN IF NOT EXISTS donor_message text;