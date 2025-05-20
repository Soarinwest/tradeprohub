import { useState } from 'react';
import BusinessForm from '../components/BusinessForm';
import LocationForm from '../components/LocationForm';
import ProfileForm from '../components/ProfileForm';
import API from '../api/api';
import { useAuth } from '../auth/useAuth';
import { toast } from 'react-toastify';

export default function CreateProfilePage() {
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [business, setBusiness] = useState({
    name: '', phone: '', email: '', logoFile: null
  });
  const [location, setLocation] = useState({
    address_line1:'', address_line2:'', city:'', state:'', postal_code:'', country:''
  });
  const [profile, setProfile] = useState({
    services_offered:'', hourly_rate:'', certifications:'', profile_photo:null
  });

  const next = () => setStep(s => s+1);
  const prev = () => setStep(s => s-1);

  const handleSubmit = async () => {
    // Build FormData with nested objects:
    const fd = new FormData();
    // Business fields
    fd.append('business.name', business.name);
    fd.append('business.phone', business.phone);
    fd.append('business.email', business.email);
    if (business.logoFile) fd.append('business.logo', business.logoFile);
    // Location fields
    Object.entries(location).forEach(([k,v]) => fd.append(`business.locations[0].${k}`, v));
    // Profile fields
    fd.append('services_offered', profile.services_offered);
    fd.append('hourly_rate', profile.hourly_rate);
    fd.append('certifications', profile.certifications);
    if (profile.profile_photo) fd.append('profile_photo', profile.profile_photo);

    try {
      await API.post('employee-profile/', fd);
      toast.success('All set! Redirecting...');
      window.location.href = '/profile';
    } catch {
      toast.error('Failed to create full profile.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10">
      {step === 1 && <BusinessForm data={business} onChange={setBusiness} />}
      {step === 2 && <LocationForm data={location} onChange={setLocation} />}
      {step === 3 && <ProfileForm profile={profile} onChange={setProfile} />}
      <div className="flex justify-between mt-6">
        {step > 1 && <button onClick={prev}>Back</button>}
        {step < 3 
          ? <button onClick={next}>Next</button>
          : <button onClick={handleSubmit}>Submit Everything</button>
        }
      </div>
    </div>
  );
}