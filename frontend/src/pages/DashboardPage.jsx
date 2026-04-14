import { useEffect, useState } from 'react';
import { apiRequest } from '../utils/api';
import AppShell from '../components/AppShell.jsx';
import StudentBatchPanel from '../components/StudentBatchPanel.jsx';
import TeacherBatchPanel from '../components/TeacherBatchPanel.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiRequest('/dashboard/stats')
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <AppShell>

      {/* 🔥 DASHBOARD STATS (PRO UI) */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div className="card">
            <p className="eyebrow">Students</p>
            <h2>{stats.totalStudents}</h2>
          </div>

          <div className="card">
            <p className="eyebrow">Teachers</p>
            <h2>{stats.totalTeachers}</h2>
          </div>

          <div className="card">
            <p className="eyebrow">Total Fees</p>
            <h2>₹{stats.totalFees}</h2>
          </div>
        </div>
      )}

      {/* EXISTING HERO */}
      <section className="hero-card">
        <p className="eyebrow">Phase one delivery</p>
        <h2>
          {user.role === 'teacher'
            ? 'Create and manage your batches'
            : 'Join and track your batches'}
        </h2>
        <p>
          Authentication and batch management are live. Schedule planning and attendance tracking
          can be layered onto this foundation next.
        </p>
      </section>

      {/* EXISTING PANELS */}
      {user.role === 'teacher'
        ? <TeacherBatchPanel />
        : <StudentBatchPanel />}

    </AppShell>
  );
}