import { useAuth } from '../hooks/useAuth.js';

export default function AppShell({ children }) {
  const { logout, user } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Tuition Management</p>
          <h1>{user.role === 'teacher' ? 'Teacher workspace' : 'Student workspace'}</h1>
        </div>
        <div className="topbar-actions">
          <div className="profile-chip">
            <span>{user.fullName}</span>
            <small>{user.email}</small>
          </div>
          <button className="secondary-button" onClick={logout} type="button">
            Log out
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

