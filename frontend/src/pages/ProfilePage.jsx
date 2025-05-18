import { useEffect, useState } from 'react';
import API from '../api/api';
import ProfileForm from '../components/ProfileForm';
import { useAuth } from '../auth/useAuth';

export default function ProfilePage() {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const { data } = await API.get('my-profile/', config);
        setProfile(data);
      } catch (err) {
        if (err.response?.status === 404) {
          window.location.href = '/create-profile';
        } else {
          console.error(err);
        }
      }
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
    try {
      await API.put('my-profile/', updatedProfile, config);
      alert('Profile updated!');
    } catch (err) {
      console.error(err);
      alert('Update failed.');
    }
  };

  if (!token || !profile) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      <ProfileForm profile={profile} onSave={handleSave} />
    </div>
  );
}