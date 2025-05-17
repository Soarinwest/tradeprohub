import { useState } from 'react';

export default function ProfileForm({ profile, onSave }) {
  const [services, setServices] = useState(profile.services_offered || '');
  const [rate, setRate] = useState(profile.hourly_rate || '');
  const [certs, setCerts] = useState(profile.certifications || '');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(profile.profile_photo || '');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('services_offered', services);
    formData.append('hourly_rate', rate);
    formData.append('certifications', certs);
    if (photo) formData.append('profile_photo', photo);
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <textarea value={services} onChange={e => setServices(e.target.value)} placeholder="Services" className="w-full p-2 border" />
      <input type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="Hourly Rate" className="w-full p-2 border" />
      <textarea value={certs} onChange={e => setCerts(e.target.value)} placeholder="Certifications" className="w-full p-2 border" />

      <div>
        <label className="block mb-1 font-medium">Profile Photo</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {preview && <img src={preview} alt="Preview" className="mt-2 h-32 object-cover border" />}
      </div>

      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">Save</button>
    </form>
  );
}