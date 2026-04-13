import { startTransition, useEffect, useState } from 'react';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../hooks/useAuth.js';

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

export default function StudentBatchPanel() {
  const { token } = useAuth();
  const [myBatches, setMyBatches] = useState([]);
  const [discoverableBatches, setDiscoverableBatches] = useState([]);
  const [batchSchedules, setBatchSchedules] = useState({});
  const [batchAttendance, setBatchAttendance] = useState({});
  const [fees, setFees] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [joiningBatchId, setJoiningBatchId] = useState('');

  async function loadSchedulesForBatches(batches) {
    const scheduleEntries = await Promise.all(
      batches.map(async (batch) => {
        const response = await apiRequest(`/schedules/${batch.id}`, { token });
        const validSchedules = response.schedules.filter(
          (schedule) => schedule && isValidDateValue(schedule.date) && isValidTimeValue(schedule.time)
        );

        return [batch.id, validSchedules];
      })
    );

    return Object.fromEntries(scheduleEntries);
  }

  async function loadAttendanceForBatches(batches) {
    const attendanceEntries = await Promise.all(
      batches.map(async (batch) => {
        const response = await apiRequest(`/attendance/${batch.id}`, { token });
        return [batch.id, response.attendance];
      })
    );

    return Object.fromEntries(attendanceEntries);
  }

  async function loadData() {
    setError('');

    try {
      const [myBatchesResponse, discoverableResponse, feesResponse] = await Promise.all([
        apiRequest('/batches', { token }),
        apiRequest('/batches/discover', { token }),
        apiRequest('/fees/student', { token })
      ]);

      const [schedulesByBatch, attendanceByBatch] = await Promise.all([
        loadSchedulesForBatches(myBatchesResponse.batches),
        loadAttendanceForBatches(myBatchesResponse.batches)
      ]);

      startTransition(() => {
        setMyBatches(myBatchesResponse.batches);
        setDiscoverableBatches(discoverableResponse.batches);
        setBatchSchedules(schedulesByBatch);
        setBatchAttendance(attendanceByBatch);
        setFees(feesResponse.fees);
      });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function joinBatch(batchId) {
    setJoiningBatchId(batchId);
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/batches/${batchId}/enroll-self`, {
        method: 'POST',
        token
      });
      setSuccess('Batch joined successfully.');
      await loadData();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setJoiningBatchId('');
    }
  }

  if (isLoading) {
    return <div className="card">Loading your enrolled and available batches...</div>;
  }

  return (
    <div className="dashboard-grid">
      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">Your learning plan</p>
          <h2>Enrolled batches</h2>
        </div>

        {myBatches.length === 0 ? (
          <p className="muted-text">You have not joined any batches yet.</p>
        ) : (
          <div className="stack">
            {myBatches.map((batch) => {
              const schedules = batchSchedules[batch.id] || [];
              const attendance = batchAttendance[batch.id] || [];

              return (
                <article className="batch-card" key={batch.id}>
                  <div className="batch-card-header">
                    <div>
                      <h3>{batch.name}</h3>
                      <p>{batch.subject}</p>
                    </div>
                    <span className="pill success-pill">{batch.enrollment_status}</span>
                  </div>
                  <p className="muted-text">{batch.description || 'No description added yet.'}</p>
                  <div className="info-row">
                    <span>Teacher: {batch.teacher_name}</span>
                    <span>
                      Dates: {formatDate(batch.start_date)} - {formatDate(batch.end_date)}
                    </span>
                  </div>

                  <div className="detail-divider" />

                  <div className="section-heading compact">
                    <p className="eyebrow">Class Schedule</p>
                    <h3>{schedules.length} upcoming sessions</h3>
                  </div>

                  {schedules.length === 0 ? (
                    <p className="muted-text">No classes scheduled yet</p>
                  ) : (
                    <div className="stack">
                      {schedules.map((schedule) => (
                        <article className="schedule-card" key={schedule.id}>
                          <div className="schedule-card-header">
                            <div>
                              <strong>{schedule.topic}</strong>
                              <p className="muted-text">Scheduled class topic</p>
                            </div>
                            <span className="pill">{formatTime(schedule.time)}</span>
                          </div>
                          <div className="info-row schedule-meta">
                            <span>{formatDate(schedule.date)}</span>
                            <span>{formatTime(schedule.time)}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div className="detail-divider" />

                  <div className="section-heading compact">
                    <p className="eyebrow">Attendance History</p>
                    <h3>{attendance.length} records</h3>
                  </div>

                  {attendance.length === 0 ? (
                    <p className="muted-text">No attendance recorded yet</p>
                  ) : (
                    <div className="table-shell">
                      <table className="attendance-table history-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendance.map((row) => (
                            <tr key={row.id}>
                              <td>{formatDate(row.date)}</td>
                              <td>
                                <span className={row.status === 'present' ? 'pill success-pill' : 'pill danger-pill'}>{row.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="section-heading">
          <p className="eyebrow">My Fees</p>
          <h2>Payments and dues</h2>
        </div>

        {fees.length === 0 ? (
          <p className="muted-text">No fees found.</p>
        ) : (
          <div className="table-shell">
            <table className="attendance-table history-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due date</th>
                  <th>Paid date</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <tr key={fee.id}>
                    <td>
                      <strong>{fee.batch_name || 'N/A'}</strong>
                      <div className="table-subtext">{fee.batch_subject || 'N/A'}</div>
                    </td>
                    <td>{formatCurrency(fee.amount)}</td>
                    <td>
                      <span className={fee.status === 'paid' ? 'pill success-pill' : 'pill danger-pill'}>{fee.status}</span>
                    </td>
                    <td>{formatDate(fee.due_date)}</td>
                    <td>{fee.paid_at ? formatDate(fee.paid_at) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="detail-divider" />

        <div className="section-heading compact">
          <p className="eyebrow">Explore more</p>
          <h2>Available batches</h2>
        </div>

        {error ? <p className="feedback error">{error}</p> : null}
        {success ? <p className="feedback success">{success}</p> : null}

        {discoverableBatches.length === 0 ? (
          <p className="muted-text">There are no additional batches available right now.</p>
        ) : (
          <div className="stack">
            {discoverableBatches.map((batch) => (
              <article className="batch-card" key={batch.id}>
                <div className="batch-card-header">
                  <div>
                    <h3>{batch.name}</h3>
                    <p>{batch.subject}</p>
                  </div>
                  <span className="pill">{batch.enrolled_count} enrolled</span>
                </div>
                <p className="muted-text">{batch.description || 'No description added yet.'}</p>
                <div className="info-row">
                  <span>Teacher: {batch.teacher_name}</span>
                  <span>
                    Dates: {formatDate(batch.start_date)} - {formatDate(batch.end_date)}
                  </span>
                </div>
                <button
                  className="primary-button"
                  disabled={joiningBatchId === batch.id}
                  onClick={() => joinBatch(batch.id)}
                  type="button"
                >
                  {joiningBatchId === batch.id ? 'Joining...' : 'Join batch'}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
