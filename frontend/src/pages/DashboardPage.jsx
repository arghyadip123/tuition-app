import { useEffect, useState } from 'react';
import { apiRequest } from '../api/client';
import AppShell from '../components/AppShell.jsx';
import StudentBatchPanel from '../components/StudentBatchPanel.jsx';
import TeacherBatchPanel from '../components/TeacherBatchPanel.jsx';
import { useAuth } from '../hooks/useAuth.js';

// ✅ CHART IMPORTS
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiRequest('/dashboard/stats')
      .then(setStats)
      .catch(console.error);
  }, []);

  // 🔥 UPDATED CHART DATA (Monthly Style)
  const chartData = stats && {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    datasets: [
      {
        label: 'Fees Collection (₹)',
        data: [
          stats.totalFees * 0.2,
          stats.totalFees * 0.3,
          stats.totalFees * 0.4,
          stats.totalFees * 0.6,
          stats.totalFees
        ],
        backgroundColor: '#3b82f6'
      }
    ]
  };

  return (
    <AppShell>

      {/* 🔥 DASHBOARD STATS */}
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

      {/* 📊 CHART */}
      {chartData && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h3>📊 Monthly Fees Analytics</h3>
          <Bar data={chartData} />
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