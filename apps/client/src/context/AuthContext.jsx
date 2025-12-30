import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* Auto Check-in Logic - Only for Employees/Staff */
  const autoCheckIn = async (parsedUser) => {
    if (parsedUser.role === 'Client') return; // Clients don't have attendance
    if (parsedUser.role === 'Client') return; // Clients don't have attendance
    try {
        const res = await fetch(`${API_URL}/api/attendance/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: parsedUser.id || parsedUser._id }),
        });
        if (!res.ok && res.status !== 400) {
            console.warn("Auto check-in issue:", res.statusText);
        }
    } catch (err) {
        console.warn("Auto check-in skipped:", err.message);
    }
  };

  const autoCheckOut = async (currUser) => {
    if (currUser.role === 'Client') return; // Clients don't have attendance
    try {
        await fetch(`${API_URL}/api/attendance/check-out`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currUser.id || currUser._id }),
        });
    } catch (err) {
        // Silent fail for checkout
    }
  };

  useEffect(() => {
    // Check for stored token
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser && savedUser !== 'undefined') {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        
        // Auto Check-in on session restore
        if (parsedUser) {
            autoCheckIn(parsedUser);
        }

      } catch (e) {
        console.error("Error parsing user from local storage", e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    } else {
        // Clear potential bad state
        if (savedUser === 'undefined') {
            localStorage.removeItem('user');
        }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save to local storage
      const { token, user } = data.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setUser(user);
      
      // Auto Check-in
      if (user) {
          autoCheckIn(user);
      }

      // navigate('/'); // REMOVED: Let the calling component handle navigation based on state
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = () => {
    if (user) {
        autoCheckOut(user);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
