import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function AuthPage() {
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  if (isLoading) {
    return <div className="page-loader">Preparing sign-in...</div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(formState) {
    setPending(true);
    setError('');

    try {
      if (mode === 'login') {
        await login(formState);
      } else {
        await register(formState);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-hero">
        <p className="eyebrow">Smart tuition operations</p>
        <h1>Run your institute with batches built around teachers, students, and clarity.</h1>
        <p>
          This first milestone ships authentication and batch management so you can create cohorts,
          assign ownership, and manage enrollment cleanly.
        </p>
        <div className="feature-strip">
          <span>Teacher and Student roles</span>
          <span>Teacher-owned batches</span>
          <span>Multi-batch enrollment</span>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-toggle">
          <button
            className={mode === 'login' ? 'toggle-button active' : 'toggle-button'}
            onClick={() => setMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={mode === 'register' ? 'toggle-button active' : 'toggle-button'}
            onClick={() => setMode('register')}
            type="button"
          >
            Register
          </button>
        </div>

        <AuthForm error={error} mode={mode} onSubmit={handleSubmit} pending={pending} />
      </section>
    </div>
  );
}

