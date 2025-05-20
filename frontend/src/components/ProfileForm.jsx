import { useState } from 'react';
import { toast } from 'react-toastify';

export default function ProfileForm({ profile, onSave }) {
  const [services, setServices] = useState(profile.services_offered || '');
  const [rate, setRate] = useState(profile.hourly_rate || '');
  const [certs, setCerts] = useState(profile.certifications || '');
  const [photo, setPhoto] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!services.trim()) errs.services = 'Required';
    if (!rate || Number(rate) <= 0) errs.rate = 'Must be > 0';
    return errs;
  };

  const handleFileChange = e => {
    const file = e.target.files[0];
    setPhoto(file);
  };

  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    const formData = new FormData();
    formData.append('services_offered', services);
    formData.append('hourly_rate', rate);
    formData.append('certifications', certs);
    if (photo) formData.append('profile_photo', photo);
    onSave(formData)
      .then(() => toast.success('Profile saved!'))
      .catch(() => toast.error('Save failed!'));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <textarea value={services} onChange={e => setServices(e.target.value)}
          placeholder="Services Offered"
          className={`w-full p-2 border ${errors.services?'border-red-500':''}`}
        />
        {errors.services && <p className="text-red-500 text-sm">{errors.services}</p>}
      </div>

      <div>
        <input type="number" value={rate} onChange={e => setRate(e.target.value)}
          placeholder="Hourly Rate"
          className={`w-full p-2 border ${errors.rate?'border-red-500':''}`}
        />
        {errors.rate && <p className="text-red-500 text-sm">{errors.rate}</p>}
      </div>

      <div>
        <textarea value={certs} onChange={e => setCerts(e.target.value)}
          placeholder="Certifications" className="w-full p-2 border" />
      </div>

      <div>
        <label className="block mb-1 font-medium">Profile Photo</label>
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
        Save Profile
      </button>
    </form>
  );
}