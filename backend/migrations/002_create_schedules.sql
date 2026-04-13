CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TIME NOT NULL,
  topic TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS schedules_batch_id_idx ON schedules (batch_id);
CREATE INDEX IF NOT EXISTS schedules_batch_date_time_idx ON schedules (batch_id, date, time);

