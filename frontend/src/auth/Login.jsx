import { useState } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'react-toastify';

export default function Login() {
  const { login } = useAuth();
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    setCreds({...creds, [e.target.name]: e.target.value});
    setErrors({...errors, [e.target.name]: ''});
  };

  const validate = () => {
    const errs = {};
    if (!creds.username.trim()) errs.username = 'Required';
    if (!creds.password) errs.password = 'Required';
    return errs;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      await login(creds.username, creds.password);
      toast.success('Logged in!');
      window.location.href = '/profile';
    } catch {
      toast.error('Invalid credentials');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold">Login</h2>

        <div>
          <input name="username" placeholder="Username" value={creds.username}
            onChange={handleChange}
            className={`w-full p-2 border ${errors.username?'border-red-500':''}`}
          />
          {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
        </div>

        <div>
          <input name="password" type="password" placeholder="Password" value={creds.password}
            onChange={handleChange}
            className={`w-full p-2 border ${errors.password?'border-red-500':''}`}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
        </div>

        <button type="submit" className="w-full bg-blue-500 text-white p-2 rounded">Login</button>

        <p className="text-sm text-center mt-4">
          Don’t have an account? <a href="/signup" className="text-blue-600">Sign up</a>
        </p>
      </form>
    </div>
  );
}