CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL CHECK (status IN ('paid', 'pending')) DEFAULT 'pending',
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fees_unique_student_batch_due_date UNIQUE (student_id, batch_id, due_date)
);

CREATE INDEX IF NOT EXISTS fees_batch_id_idx ON fees (batch_id);
CREATE INDEX IF NOT EXISTS fees_student_id_idx ON fees (student_id);
CREATE INDEX IF NOT EXISTS fees_status_idx ON fees (status);

