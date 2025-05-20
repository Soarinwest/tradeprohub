// frontend/src/components/BusinessForm.jsx
import { useState } from 'react';

export default function BusinessForm({ data, onChange }) {
  // data = { name, phone, email, logoFile }
  const handleText = e => onChange({ ...data, [e.target.name]: e.target.value });
  const handleFile = e => onChange({ ...data, logoFile: e.target.files[0] });

  return (
    <div className="space-y-4">
      <div>
        <label>Business Name</label>
        <input
          name="name"
          value={data.name}
          onChange={handleText}
          className="w-full p-2 border"
        />
      </div>
      <div>
        <label>Phone</label>
        <input
          name="phone"
          value={data.phone}
          onChange={handleText}
          className="w-full p-2 border"
        />
      </div>
      <div>
        <label>Email</label>
        <input
          name="email"
          type="email"
          value={data.email}
          onChange={handleText}
          className="w-full p-2 border"
        />
      </div>
      <div>
        <label>Logo</label>
        <input type="file" accept="image/*" onChange={handleFile} />
      </div>
    </div>
  );
}