import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup'; // New
import LandingPage from './pages/LandingPage'; // New
import Users from './pages/Users';
import Contacts from './pages/Contacts';
import Opportunities from './pages/Opportunities';
import Tickets from './pages/Tickets';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import Settings from './pages/Settings';
import Explore from './pages/Explore';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Protected Routes (The "App") */}
        <Route path="/app" element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="explore" element={<Explore />} />
            
            {/* Common Routes */}
            <Route path="tickets" element={<Tickets />} />
            <Route path="settings" element={<Settings />} />

            {/* Employee/Admin Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Admin', 'Employee', 'Sales', 'HR']} />}>
                 <Route path="contacts" element={<Contacts />} />
                 <Route path="sales" element={<Opportunities />} />
                 <Route path="products" element={<Products />} />
                 <Route path="payments" element={<Payments />} />
                 <Route path="tasks" element={<Tasks />} />
                 <Route path="calendar" element={<Calendar />} />
                 <Route path="attendance" element={<Attendance />} />
                 <Route path="payroll" element={<Payroll />} />
            </Route>

            {/* Admin Only Routes */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
              <Route path="users" element={<Users />} />
              <Route path="invoices" element={<Invoices />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
