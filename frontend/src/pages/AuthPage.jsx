import { useState } from 'react';
import { apiRequest } from '../api/client';
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = isLogin ? '/auth/login' : '/auth/register';

    const payload = isLogin
      ? { email, password }
      : { fullName, email, password, role };

    try {
      const res = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log(res);
      alert('Success!');
    } catch (err) {
      console.error(err);
      alert('Error occurred');
    }
  };

  return (
    <div>
      <h2>{isLogin ? 'Login' : 'Register'}</h2>

      <form onSubmit={handleSubmit}>
        
        {!isLogin && (
          <>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            {/* ✅ ROLE DROPDOWN (UPDATED) */}
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="admin">Admin 👑</option>
            </select>
          </>
        )}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">
          {isLogin ? 'Login' : 'Register'}
        </button>
      </form>

      <button onClick={() => setIsLogin(!isLogin)}>
        Switch to {isLogin ? 'Register' : 'Login'}
      </button>
    </div>
  );
}