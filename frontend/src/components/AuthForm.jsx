import { useState } from 'react';

const defaultState = {
  fullName: '',
  email: '',
  password: '',
  role: 'teacher'
};

export default function AuthForm({ error, mode, onSubmit, pending }) {
  const [formState, setFormState] = useState(defaultState);

  function updateField(event) {
    const { name, value } = event.target;
    setFormState((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await onSubmit(formState);

    if (mode === 'register') {
      setFormState((current) => ({
        ...current,
        password: ''
      }));
    }
  }

  return (
    <form className="card auth-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <p className="eyebrow">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>
        <h2>
          {mode === 'login'
            ? 'Sign in to continue'
            : 'Start your tuition workspace'}
        </h2>
      </div>

      {/* FULL NAME */}
      {mode === 'register' && (
        <label className="field">
          <span>Full name</span>
          <input
            name="fullName"
            onChange={updateField}
            placeholder="Aman Sharma"
            required
            value={formState.fullName}
          />
        </label>
      )}

      {/* EMAIL */}
      <label className="field">
        <span>Email address</span>
        <input
          name="email"
          onChange={updateField}
          placeholder="you@example.com"
          required
          type="email"
          value={formState.email}
        />
      </label>

      {/* PASSWORD */}
      <label className="field">
        <span>Password</span>
        <input
          minLength={6}
          name="password"
          onChange={updateField}
          placeholder="Minimum 6 characters"
          required
          type="password"
          value={formState.password}
        />
      </label>

      {/* 🔥 UPDATED ROLE DROPDOWN */}
      {mode === 'register' && (
        <label className="field">
          <span>Role</span>
          <select name="role" onChange={updateField} value={formState.role}>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            <option value="admin">Admin 👑</option> {/* ✅ ADDED */}
          </select>
        </label>
      )}

      {/* ERROR */}
      {error ? <p className="feedback error">{error}</p> : null}

      {/* BUTTON */}
      <button className="primary-button" disabled={pending} type="submit">
        {pending
          ? 'Please wait...'
          : mode === 'login'
          ? 'Login'
          : 'Create account'}
      </button>
    </form>
  );
}