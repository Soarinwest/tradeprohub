import { useEffect, useState } from 'react';
import API from '../api/api';
import ProfileForm from '../components/ProfileForm';
import { useAuth } from '../auth/useAuth';

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data } = await API.get('my-profile/', config);
      setProfile(data);
    };
    if (token) fetchProfile();
  }, [token]);

  const handleSave = async (updatedProfile) => {
    const config = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    };
    await API.put('my-profile/', updatedProfile, config);
    alert('Profile updated!');
  };
  if (!profile) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      <ProfileForm profile={profile} onSave={handleSave} />
    </div>
  );
}

