import AppShell from '../components/AppShell.jsx';
import StudentBatchPanel from '../components/StudentBatchPanel.jsx';
import TeacherBatchPanel from '../components/TeacherBatchPanel.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <section className="hero-card">
        <p className="eyebrow">Phase one delivery</p>
        <h2>{user.role === 'teacher' ? 'Create and manage your batches' : 'Join and track your batches'}</h2>
        <p>
          Authentication and batch management are live. Schedule planning and attendance tracking
          can be layered onto this foundation next.
        </p>
      </section>

      {user.role === 'teacher' ? <TeacherBatchPanel /> : <StudentBatchPanel />}
    </AppShell>
  );
}
