import { useState } from 'react';
import API from '../api/api';

export default function Signup() {
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('register/', form);
      alert('Account created! Please log in.');
      window.location.href = '/';
    } catch (err) {
      setError('Signup failed — try a different username or password.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md space-y-4">
            <h2 className="text-xl font-bold">Sign Up</h2>
            <input type="text" name="username" placeholder="Username" value={form.username} onChange={handleChange} className="w-full p-2 border" />
            <input type="email" name="email" placeholder="Email" value={form.email} onChange={handleChange} className="w-full p-2 border" />
            <input type="password" name="password" placeholder="Password" value={form.password} onChange={handleChange} className="w-full p-2 border" />
            {error && <p className="text-red-500">{error}</p>}
            <button type="submit" className="w-full bg-green-500 text-white p-2 rounded">Sign Up</button>
        </form>
    <p className="text-sm text-center">
        Don’t have an account? <a href="/signup" className="text-blue-600">Sign up</a>
    </p>
    </div>
  );
}