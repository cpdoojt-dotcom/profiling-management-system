import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DriversList from './pages/DriversList';
import OperatorsPage from './pages/OperatorsPage';
import DriverForm from './pages/DriverForm';
import OperatorForm from './pages/OperatorForm';
import UnitMonitoring from './pages/UnitMonitoring';
import ConductorList from './pages/ConductorList';
import ConductorForm from './pages/ConductorForm';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="operators" element={<OperatorsPage />} />
        <Route path="operators/new" element={<OperatorForm />} />
        <Route path="drivers" element={<DriversList />} />
        <Route path="drivers/new" element={<DriverForm />} />
        <Route path="conductors" element={<ConductorList />} />
        <Route path="conductors/new" element={<ConductorForm />} />
        <Route path="monitoring" element={<UnitMonitoring />} />
      </Route>
    </Routes>
  );
}

export default App;
