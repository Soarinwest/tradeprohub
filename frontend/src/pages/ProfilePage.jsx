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
      const { data } = await API.get('profile/1/', config); // TODO: Replace '1' with dynamic user id
      setProfile(data);
    };
    if (token) fetchProfile();
  }, [token]);

  const handleSave = async (updatedProfile) => {
    const config = { headers: { Authorization: `Bearer ${token}` } };
    await API.put('profile/1/', updatedProfile, config); // Same: use dynamic id later
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

