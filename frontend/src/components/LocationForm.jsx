// frontend/src/components/LocationForm.jsx
import { useState } from 'react';

export default function LocationForm({ data, onChange }) {
  const handleText = e => onChange({ ...data, [e.target.name]: e.target.value });

  return (
    <div className="space-y-4">
      <div>
        <label>Address Line 1</label>
        <input
          name="address_line1"
          value={data.address_line1}
          onChange={handleText}
          className="w-full p-2 border"
        />
      </div>
      <div>
        <label>Address Line 2</label>
        <input
          name="address_line2"
          value={data.address_line2}
          onChange={handleText}
          className="w-full p-2 border"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label>City</label>
          <input name="city" value={data.city} onChange={handleText} className="w-full p-2 border" />
        </div>
        <div>
          <label>State</label>
          <input name="state" value={data.state} onChange={handleText} className="w-full p-2 border" />
        </div>
        <div>
          <label>Postal Code</label>
          <input name="postal_code" value={data.postal_code} onChange={handleText} className="w-full p-2 border" />
        </div>
      </div>
      <div>
        <label>Country</label>
        <input name="country" value={data.country} onChange={handleText} className="w-full p-2 border" />
      </div>
    </div>
  );
}