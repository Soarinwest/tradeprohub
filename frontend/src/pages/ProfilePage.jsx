// frontend/src/pages/ProfilePage.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import ProfileForm from '../components/ProfileForm';
import { useAuth } from '../auth/useAuth';

export default function ProfilePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    const fetchProfile = async () => {
      try {
        const { data } = await API.get('my-employee-profile/');
        setProfile(data);
      } catch (err) {
        const status = err.response?.status;
        if (status === 404) {
          navigate('/create-profile');
        } else if (status === 401) {
          navigate('/');
        } else {
          console.error(err);
        }
      }
    };
    fetchProfile();
  }, [token, navigate]);

  const handleSave = async (updatedProfile) => {
    try {
      await API.put('my-employee-profile/', updatedProfile);
      alert('Profile updated!');
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/');
      } else {
        console.error(err);
        alert('Update failed.');
      }
    }
  };

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
      <ProfileForm profile={profile} onSave={handleSave} />
    </div>
  );
}
