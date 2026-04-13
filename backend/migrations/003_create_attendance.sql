CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT attendance_unique_batch_student_date UNIQUE (batch_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS attendance_batch_id_idx ON attendance (batch_id);
CREATE INDEX IF NOT EXISTS attendance_student_id_idx ON attendance (student_id);
CREATE INDEX IF NOT EXISTS attendance_batch_date_idx ON attendance (batch_id, date);

