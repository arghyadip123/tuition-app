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
    return <div className="page-loader">Preparing...</div>;
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
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-panel">

        <div className="auth-toggle">
          <button onClick={() => setMode('login')}>
            Login
          </button>

          <button onClick={() => setMode('register')}>
            Register
          </button>
        </div>

        <AuthForm
          error={error}
          mode={mode}
          onSubmit={handleSubmit}
          pending={pending}
        />

      </section>
    </div>
  );
}