import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './auth/Login';
import ProfilePage from './pages/ProfilePage';
import Signup from './auth/Signup';


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/create-profile" element={<CreateProfilePage />} />
      </Routes>
    </Router>
  );
}

export default App;
