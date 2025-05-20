import { useState } from 'react';
import API from '../api/api';
import { toast } from 'react-toastify';

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});

  const handleChange = e => {
    setForm({...form, [e.target.name]: e.target.value});
    setErrors({...errors, [e.target.name]: ''});
  };

  const validate = () => {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    if (!form.email.match(/^\S+@\S+\.\S+$/)) errs.email = 'Valid email required';
    if (form.password.length < 6) errs.password = 'Password must be ≥ 6 chars';
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
      await API.post('register/', form);
      toast.success('Account created! Please log in.');
      setForm({ username:'', email:'', password:'' });
      setTimeout(() => window.location.href = '/', 1000);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm space-y-4">
        <h2 className="text-xl font-bold">Sign Up</h2>

        <div>
          <input name="username" placeholder="Username" value={form.username}
            onChange={handleChange}
            className={`w-full p-2 border ${errors.username?'border-red-500':''}`}
          />
          {errors.username && <p className="text-red-500 text-sm">{errors.username}</p>}
        </div>

        <div>
          <input name="email" placeholder="Email" value={form.email}
            onChange={handleChange}
            className={`w-full p-2 border ${errors.email?'border-red-500':''}`}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>

        <div>
          <input name="password" type="password" placeholder="Password" value={form.password}
            onChange={handleChange}
            className={`w-full p-2 border ${errors.password?'border-red-500':''}`}
          />
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
        </div>

        <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Sign Up</button>

        <p className="text-sm text-center mt-4">
          Already have an account? <a href="/" className="text-blue-600">Log in</a>
        </p>
      </form>
    </div>
  );
}