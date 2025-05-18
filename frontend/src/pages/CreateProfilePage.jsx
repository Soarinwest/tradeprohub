import ProfileForm from '../components/ProfileForm';
import API from '../api/api';
import { useAuth } from '../auth/useAuth';

export default function CreateProfilePage() {
  const { token } = useAuth();

  const handleCreate = async (formData) => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      };
      await API.post('profile/', formData, config);
      alert('Profile created!');
      window.location.href = '/profile';
    } catch (err) {
      console.error(err);
      alert('Profile creation failed.');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-bold mb-4">Create Your Profile</h2>
      <ProfileForm profile={{}} onSave={handleCreate} />
    </div>
  );
}