-- Track whether a member should continue regular savings after a loan is closed.
ALTER TABLE members
  ADD COLUMN IF NOT EXISTS continue_saving boolean NOT NULL DEFAULT true;
