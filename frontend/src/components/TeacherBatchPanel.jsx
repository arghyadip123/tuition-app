import { startTransition, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

const initialBatchForm = {
  name: '',
  subject: '',
  description: '',
  startDate: '',
  endDate: '',
  capacity: ''
};

const initialScheduleForm = {
  date: '',
  time: '',
  topic: ''
};

function isValidDateValue(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  const normalizedValue = value.includes('T') ? value : `${value}T00:00:00Z`;
  const parsedDate = new Date(normalizedValue);

  return !Number.isNaN(parsedDate.getTime());
}

function isValidTimeValue(value) {
  if (!value || typeof value !== 'string') {
    return false;
  }

  return /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.test(value.trim());
}

function formatDate(value) {
  if (!isValidDateValue(value)) {
    return 'N/A';
  }

  const normalizedValue = value.includes('T') ? value : `${value}T00:00:00Z`;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeZone: 'UTC'
  }).format(new Date(normalizedValue));
}

function formatTime(value) {
  if (!isValidTimeValue(value)) {
    return 'N/A';
  }

  const [hours = '0', minutes = '0'] = value.split(':');
  const date = new Date(Date.UTC(1970, 0, 1, Number(hours), Number(minutes)));

  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(date);
}

function formatCurrency(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 'N/A';
  }

  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(numericValue);
}

function buildAttendanceMap(attendanceRows, students) {
  const latestByStudent = {};

  for (const row of attendanceRows) {
    const studentKey = row.student_id;
    if (!latestByStudent[studentKey]) {
      latestByStudent[studentKey] = row.status;
    }
  }

  return Object.fromEntries(students.map((student) => [student.id, latestByStudent[student.id] || 'present']));
}

function buildFeeDrafts(students) {
  return Object.fromEntries(
    students.map((student) => [
      student.id,
      {
        amount: '',
        dueDate: ''
      }
    ])
  );
}

export default function TeacherBatchPanel() {
  const { token } = useAuth();
  const [batchForm, setBatchForm] = useState(initialBatchForm);
  const [scheduleForm, setScheduleForm] = useState(initialScheduleForm);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceDraft, setAttendanceDraft] = useState({});
  const [feeDrafts, setFeeDrafts] = useState({});
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [fees, setFees] = useState([]);
  const [enrollmentEmail, setEnrollmentEmail] = useState('');
  const [createBatchError, setCreateBatchError] = useState('');
  const [createBatchSuccess, setCreateBatchSuccess] = useState('');
  const [detailError, setDetailError] = useState('');
  const [enrollmentError, setEnrollmentError] = useState('');
  const [enrollmentSuccess, setEnrollmentSuccess] = useState('');
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleSuccess, setScheduleSuccess] = useState('');
  const [attendanceError, setAttendanceError] = useState('');
  const [attendanceSuccess, setAttendanceSuccess] = useState('');
  const [feeError, setFeeError] = useState('');
  const [feeSuccess, setFeeSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isScheduleSaving, setIsScheduleSaving] = useState(false);
  const [isAttendanceSaving, setIsAttendanceSaving] = useState(false);
  const [isSchedulesLoading, setIsSchedulesLoading] = useState(false);
  const [savingFeeStudentId, setSavingFeeStudentId] = useState('');
  const [payingFeeId, setPayingFeeId] = useState('');
  const validSchedules = schedules.filter(
    (schedule) => schedule && isValidDateValue(schedule.date) && isValidTimeValue(schedule.time)
  );
  const skippedSchedulesCount = schedules.length - validSchedules.length;

  async function loadSelectedBatchData(batchId) {
    if (!batchId) {
      startTransition(() => {
        setSelectedBatch(null);
        setSchedules([]);
        setAttendanceRows([]);
        setAttendanceDraft({});
        setFees([]);
        setFeeDrafts({});
      });
      return;
    }

    setIsSchedulesLoading(true);

    try {
      const [detailResponse, schedulesResponse, attendanceResponse, feesResponse] = await Promise.all([
        apiRequest(`/batches/${batchId}`, { token }),
        apiRequest(`/schedules/${batchId}`, { token }),
        apiRequest(`/attendance/${batchId}`, { token }),
        apiRequest(`/fees/batch/${batchId}`, { token })
      ]);

      const nextAttendanceDraft = buildAttendanceMap(attendanceResponse.attendance, detailResponse.batch.students);
      const nextFeeDrafts = buildFeeDrafts(detailResponse.batch.students);

      startTransition(() => {
        setSelectedBatch(detailResponse.batch);
        setSchedules(schedulesResponse.schedules);
        setAttendanceRows(attendanceResponse.attendance);
        setAttendanceDraft(nextAttendanceDraft);
        setFees(feesResponse.fees);
        setFeeDrafts(nextFeeDrafts);
      });
    } finally {
      setIsSchedulesLoading(false);
    }
  }

  async function loadBatches(preferredBatchId = '') {
    const response = await apiRequest('/batches', { token });
    const nextSelectedBatchId = preferredBatchId || selectedBatchId || response.batches[0]?.id || '';

    startTransition(() => {
      setBatches(response.batches);
      setSelectedBatchId(nextSelectedBatchId);
    });

    await loadSelectedBatchData(nextSelectedBatchId);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await loadBatches();
      } catch (requestError) {
        setDetailError(requestError.message);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, []);

  function clearDetailFeedback() {
    setDetailError('');
    setEnrollmentError('');
    setEnrollmentSuccess('');
    setScheduleError('');
    setScheduleSuccess('');
    setAttendanceError('');
    setAttendanceSuccess('');
    setFeeError('');
    setFeeSuccess('');
  }

  function updateBatchField(event) {
    const { name, value } = event.target;
    setBatchForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateScheduleField(event) {
    const { name, value } = event.target;
    setScheduleForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function updateAttendanceStatus(studentId, status) {
    setAttendanceDraft((current) => ({
      ...current,
      [studentId]: status
    }));
  }

  function updateFeeDraft(studentId, field, value) {
    setFeeDrafts((current) => ({
      ...current,
      [studentId]: {
        ...current[studentId],
        [field]: value
      }
    }));
  }

  async function handleCreateBatch(event) {
    event.preventDefault();
    setIsSaving(true);
    setCreateBatchError('');
    setCreateBatchSuccess('');

    try {
      const response = await apiRequest('/batches', {
        method: 'POST',
        token,
        body: batchForm
      });

      setBatchForm(initialBatchForm);
      setCreateBatchSuccess('Batch created successfully.');
      clearDetailFeedback();
      await loadBatches(response.batch.id);
    } catch (requestError) {
      setCreateBatchError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBatchSelection(batchId) {
    setSelectedBatchId(batchId);
    clearDetailFeedback();

    try {
      await loadSelectedBatchData(batchId);
    } catch (requestError) {
      setDetailError(requestError.message);
    }
  }

  async function handleCreateSchedule(event) {
    event.preventDefault();
    if (!selectedBatchId) {
      return;
    }

    setIsScheduleSaving(true);
    setScheduleError('');
    setScheduleSuccess('');

    try {
      await apiRequest('/schedules', {
        method: 'POST',
        token,
        body: {
          batchId: selectedBatchId,
          ...scheduleForm
        }
      });

      setScheduleForm(initialScheduleForm);
      setScheduleSuccess('Schedule added successfully.');
      await loadSelectedBatchData(selectedBatchId);
    } catch (requestError) {
      setScheduleError(requestError.message);
    } finally {
      setIsScheduleSaving(false);
    }
  }

  async function handleAttendanceSubmit(event) {
    event.preventDefault();
    if (!selectedBatchId || !selectedBatch?.students?.length) {
      return;
    }

    setIsAttendanceSaving(true);
    setAttendanceError('');
    setAttendanceSuccess('');

    try {
      await apiRequest('/attendance', {
        method: 'POST',
        token,
        body: {
          batchId: selectedBatchId,
          date: attendanceDate,
          records: selectedBatch.students.map((student) => ({
            studentId: student.id,
            status: attendanceDraft[student.id] || 'present'
          }))
        }
      });

      setAttendanceSuccess('Attendance saved successfully.');
      await loadSelectedBatchData(selectedBatchId);
    } catch (requestError) {
      setAttendanceError(requestError.message);
    } finally {
      setIsAttendanceSaving(false);
    }
  }

  async function handleCreateFee(studentId) {
    const draft = feeDrafts[studentId];

    if (!selectedBatchId || !draft?.amount || !draft?.dueDate) {
      setFeeError('Amount and due date are required to create a fee.');
      setFeeSuccess('');
      return;
    }

    setSavingFeeStudentId(studentId);
    setFeeError('');
    setFeeSuccess('');

    try {
      await apiRequest('/fees', {
        method: 'POST',
        token,
        body: {
          studentId,
          batchId: selectedBatchId,
          amount: Number(draft.amount),
          dueDate: draft.dueDate
        }
      });

      setFeeSuccess('Fee created successfully.');
      await loadSelectedBatchData(selectedBatchId);
    } catch (requestError) {
      setFeeError(requestError.message);
    } finally {
      setSavingFeeStudentId('');
    }
  }

  async function handleMarkFeePaid(feeId) {
    setPayingFeeId(feeId);
    setFeeError('');
    setFeeSuccess('');

    try {
      await apiRequest(`/fees/${feeId}/pay`, {
        method: 'PATCH',
        token
      });

      setFeeSuccess('Fee marked as paid.');
      await loadSelectedBatchData(selectedBatchId);
    } catch (requestError) {
      setFeeError(requestError.message);
    } finally {
      setPayingFeeId('');
    }
  }

  async function handleEnrollment(event) {
    event.preventDefault();
    if (!selectedBatchId) {
      return;
    }

    setIsEnrolling(true);
    setEnrollmentError('');
    setEnrollmentSuccess('');

    try {
      await apiRequest(`/batches/${selectedBatchId}/enrollments`, {
        method: 'POST',
        token,
        body: {
          studentEmail: enrollmentEmail
        }
      });

      setEnrollmentEmail('');
      setEnrollmentSuccess('Student enrolled successfully.');
      await loadBatches(selectedBatchId);
    } catch (requestError) {
      setEnrollmentError(requestError.message);
    } finally {
      setIsEnrolling(false);
    }
  }

  if (isLoading) {
    return <div className="card">Loading your teaching dashboard...</div>;
  }

  return (
    <div className="dashboard-grid">
      <section className="stack">
        <form className="card" onSubmit={handleCreateBatch}>
          <div className="section-heading">
            <p className="eyebrow">Set up a new cohort</p>
            <h2>Create a batch</h2>
          </div>

          <div className="two-column-form">
            <label className="field">
              <span>Batch name</span>
              <input name="name" onChange={updateBatchField} placeholder="Class 10 Maths - Morning" required value={batchForm.name} />
            </label>

            <label className="field">
              <span>Subject</span>
              <input name="subject" onChange={updateBatchField} placeholder="Mathematics" required value={batchForm.subject} />
            </label>

            <label className="field field-full">
              <span>Description</span>
              <textarea
                name="description"
                onChange={updateBatchField}
                placeholder="Focus, syllabus coverage, and teaching style"
                rows={4}
                value={batchForm.description}
              />
            </label>

            <label className="field">
              <span>Start date</span>
              <input name="startDate" onChange={updateBatchField} type="date" value={batchForm.startDate} />
            </label>

            <label className="field">
              <span>End date</span>
              <input name="endDate" onChange={updateBatchField} type="date" value={batchForm.endDate} />
            </label>

            <label className="field">
              <span>Capacity</span>
              <input min="1" name="capacity" onChange={updateBatchField} placeholder="30" type="number" value={batchForm.capacity} />
            </label>
          </div>

          {createBatchError ? <p className="feedback error">{createBatchError}</p> : null}
          {createBatchSuccess ? <p className="feedback success">{createBatchSuccess}</p> : null}

          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? 'Creating batch...' : 'Create batch'}
          </button>
        </form>

        <section className="card">
          <div className="section-heading">
            <p className="eyebrow">Your batches</p>
            <h2>Owned by you</h2>
          </div>

          {batches.length === 0 ? (
            <p className="muted-text">Create your first batch to start enrolling students.</p>
          ) : (
            <div className="stack">
              {batches.map((batch) => (
                <button
                  className={`batch-card selectable ${selectedBatchId === batch.id ? 'selected' : ''}`}
                  key={batch.id}
                  onClick={() => handleBatchSelection(batch.id)}
                  type="button"
                >
                  <div className="batch-card-header">
                    <div>
                      <h3>{batch.name}</h3>
                      <p>{batch.subject}</p>
                    </div>
                    <span className="pill">{batch.enrolled_count} students</span>
                  </div>
                  <p className="muted-text">{batch.description || 'No description added yet.'}</p>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>

      <section className="card detail-panel">
        <div className="section-heading">
          <p className="eyebrow">Batch details</p>
          <h2>{selectedBatch ? selectedBatch.name : 'Select a batch'}</h2>
        </div>

        {!selectedBatch ? (
          <p className="muted-text">Choose a batch from the list to view students, schedules, attendance, and fees.</p>
        ) : (
          <>
            {detailError ? <p className="feedback error">{detailError}</p> : null}

            <div className="info-grid">
              <div>
                <span className="label">Subject</span>
                <strong>{selectedBatch.subject}</strong>
              </div>
              <div>
                <span className="label">Capacity</span>
                <strong>{selectedBatch.capacity || 'Open'}</strong>
              </div>
              <div>
                <span className="label">Start date</span>
                <strong>{formatDate(selectedBatch.start_date)}</strong>
              </div>
              <div>
                <span className="label">End date</span>
                <strong>{formatDate(selectedBatch.end_date)}</strong>
              </div>
            </div>

            <p className="muted-text">{selectedBatch.description || 'No description added yet.'}</p>

            <div className="detail-divider" />

            <div className="section-heading compact">
              <p className="eyebrow">Schedule planner</p>
              <h3>{validSchedules.length} planned sessions</h3>
            </div>

            <form className="schedule-form" onSubmit={handleCreateSchedule}>
              <div className="two-column-form">
                <label className="field">
                  <span>Date</span>
                  <input name="date" onChange={updateScheduleField} required type="date" value={scheduleForm.date} />
                </label>

                <label className="field">
                  <span>Time</span>
                  <input name="time" onChange={updateScheduleField} required type="time" value={scheduleForm.time} />
                </label>

                <label className="field field-full">
                  <span>Topic</span>
                  <input
                    name="topic"
                    onChange={updateScheduleField}
                    placeholder="Quadratic equations revision"
                    required
                    value={scheduleForm.topic}
                  />
                </label>
              </div>

              {scheduleError ? <p className="feedback error">{scheduleError}</p> : null}
              {scheduleSuccess ? <p className="feedback success">{scheduleSuccess}</p> : null}

              <button className="primary-button" disabled={isScheduleSaving} type="submit">
                {isScheduleSaving ? 'Saving schedule...' : 'Add schedule'}
              </button>
            </form>

            {isSchedulesLoading ? (
              <p className="muted-text">Loading schedules...</p>
            ) : validSchedules.length === 0 ? (
              <p className="muted-text">No schedules planned yet for this batch.</p>
            ) : (
              <div className="stack">
                {validSchedules.map((schedule) => (
                  <article className="schedule-card" key={schedule.id}>
                    <div className="schedule-card-header">
                      <div>
                        <strong>{schedule.topic}</strong>
                        <p className="muted-text">Planned teaching topic</p>
                      </div>
                      <span className="pill">{formatTime(schedule.time)}</span>
                    </div>
                    <div className="info-row schedule-meta">
                      <span>{formatDate(schedule.date)}</span>
                      <span>Starts at {formatTime(schedule.time)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {skippedSchedulesCount > 0 ? (
              <p className="muted-text">
                {skippedSchedulesCount} schedule {skippedSchedulesCount === 1 ? 'entry was' : 'entries were'} hidden because the date or time was invalid.
              </p>
            ) : null}

            <div className="detail-divider" />

            <form className="attendance-form" onSubmit={handleAttendanceSubmit}>
              <div className="section-heading compact">
                <p className="eyebrow">Attendance</p>
                <h3>Mark daily attendance</h3>
              </div>

              <label className="field attendance-date-field">
                <span>Attendance date</span>
                <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} required />
              </label>

              {selectedBatch.students.length === 0 ? (
                <p className="muted-text">Enroll students to start marking attendance.</p>
              ) : (
                <div className="table-shell">
                  <table className="attendance-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Email</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBatch.students.map((student) => (
                        <tr key={student.id}>
                          <td>{student.full_name}</td>
                          <td>{student.email}</td>
                          <td>
                            <div className="toggle-group">
                              <button
                                className={attendanceDraft[student.id] === 'present' ? 'toggle-choice active' : 'toggle-choice'}
                                onClick={() => updateAttendanceStatus(student.id, 'present')}
                                type="button"
                              >
                                Present
                              </button>
                              <button
                                className={attendanceDraft[student.id] === 'absent' ? 'toggle-choice danger' : 'toggle-choice'}
                                onClick={() => updateAttendanceStatus(student.id, 'absent')}
                                type="button"
                              >
                                Absent
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {attendanceError ? <p className="feedback error">{attendanceError}</p> : null}
              {attendanceSuccess ? <p className="feedback success">{attendanceSuccess}</p> : null}

              <button className="primary-button" disabled={isAttendanceSaving || selectedBatch.students.length === 0} type="submit">
                {isAttendanceSaving ? 'Saving attendance...' : 'Submit attendance'}
              </button>
            </form>

            <div className="section-heading compact">
              <p className="eyebrow">Attendance history</p>
              <h3>{attendanceRows.length} recorded entries</h3>
            </div>

            {attendanceRows.length === 0 ? (
              <p className="muted-text">No attendance recorded yet for this batch.</p>
            ) : (
              <div className="table-shell">
                <table className="attendance-table history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Student</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRows.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.date)}</td>
                        <td>{row.student_name}</td>
                        <td>
                          <span className={row.status === 'present' ? 'pill success-pill' : 'pill danger-pill'}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="detail-divider" />

            <div className="section-heading compact">
              <p className="eyebrow">Fees</p>
              <h3>Manage student dues</h3>
            </div>

            {selectedBatch.students.length === 0 ? (
              <p className="muted-text">Enroll students to create fee entries.</p>
            ) : (
              <div className="stack">
                {selectedBatch.students.map((student) => {
                  const draft = feeDrafts[student.id] || { amount: '', dueDate: '' };

                  return (
                    <article className="student-action-card" key={student.id}>
                      <div className="batch-card-header">
                        <div>
                          <strong>{student.full_name}</strong>
                          <p className="muted-text">{student.email}</p>
                        </div>
                      </div>
                      <div className="two-column-form">
                        <label className="field">
                          <span>Amount</span>
                          <input
                            min="0"
                            onChange={(event) => updateFeeDraft(student.id, 'amount', event.target.value)}
                            placeholder="2500"
                            type="number"
                            value={draft.amount}
                          />
                        </label>
                        <label className="field">
                          <span>Due date</span>
                          <input onChange={(event) => updateFeeDraft(student.id, 'dueDate', event.target.value)} type="date" value={draft.dueDate} />
                        </label>
                      </div>
                      <button
                        className="primary-button"
                        disabled={savingFeeStudentId === student.id}
                        onClick={() => handleCreateFee(student.id)}
                        type="button"
                      >
                        {savingFeeStudentId === student.id ? 'Creating fee...' : 'Create fee'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {feeError ? <p className="feedback error">{feeError}</p> : null}
            {feeSuccess ? <p className="feedback success">{feeSuccess}</p> : null}

            <div className="section-heading compact">
              <p className="eyebrow">Fee list</p>
              <h3>{fees.length} fee records</h3>
            </div>

            {fees.length === 0 ? (
              <p className="muted-text">No fees found.</p>
            ) : (
              <div className="table-shell">
                <table className="attendance-table history-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Due date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((fee) => (
                      <tr key={fee.id}>
                        <td>{fee.student_name}</td>
                        <td>{formatCurrency(fee.amount)}</td>
                        <td>
                          <span className={fee.status === 'paid' ? 'pill success-pill' : 'pill danger-pill'}>{fee.status}</span>
                        </td>
                        <td>{formatDate(fee.due_date)}</td>
                        <td>
                          <button
                            className="secondary-button inline-button"
                            disabled={fee.status === 'paid' || payingFeeId === fee.id}
                            onClick={() => handleMarkFeePaid(fee.id)}
                            type="button"
                          >
                            {fee.status === 'paid' ? 'Paid' : payingFeeId === fee.id ? 'Updating...' : 'Mark Paid'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="detail-divider" />

            <form className="enrollment-form" onSubmit={handleEnrollment}>
              <div className="section-heading compact">
                <p className="eyebrow">Enrollment</p>
                <h3>Add a student to this batch</h3>
              </div>

              <label className="field field-full">
                <span>Enroll a student by email</span>
                <input
                  name="studentEmail"
                  onChange={(event) => setEnrollmentEmail(event.target.value)}
                  placeholder="student@example.com"
                  required
                  type="email"
                  value={enrollmentEmail}
                />
              </label>

              {enrollmentError ? <p className="feedback error">{enrollmentError}</p> : null}
              {enrollmentSuccess ? <p className="feedback success">{enrollmentSuccess}</p> : null}

              <button className="primary-button" disabled={isEnrolling} type="submit">
                {isEnrolling ? 'Enrolling...' : 'Enroll student'}
              </button>
            </form>

            <div className="section-heading compact">
              <p className="eyebrow">Enrolled students</p>
              <h3>{selectedBatch.students.length} active learners</h3>
            </div>

            {selectedBatch.students.length === 0 ? (
              <p className="muted-text">No students enrolled yet.</p>
            ) : (
              <div className="stack">
                {selectedBatch.students.map((student) => (
                  <article className="student-row" key={student.id}>
                    <div>
                      <strong>{student.full_name}</strong>
                      <p>{student.email}</p>
                    </div>
                    <span className="pill success-pill">{student.status}</span>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
