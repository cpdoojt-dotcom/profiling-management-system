import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DriversList from './pages/DriversList';
import OperatorsPage from './pages/OperatorsPage';
import DriverForm from './pages/DriverForm';
import OperatorForm from './pages/OperatorForm';
import UnitHistory from './pages/UnitHistory';
import ConductorList from './pages/ConductorList';
import ConductorForm from './pages/ConductorForm';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import { ConfirmProvider } from './context/ConfirmContext';
import { ToastProvider } from './context/ToastContext';
import AuditLogs from './pages/AuditLogs';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
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
            <Route 
              path="operators/new" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <OperatorForm />
                </ProtectedRoute>
              } 
            />
            <Route path="drivers" element={<DriversList />} />
            <Route 
              path="drivers/new" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <DriverForm />
                </ProtectedRoute>
              } 
            />
            <Route path="conductors" element={<ConductorList />} />
            <Route 
              path="conductors/new" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <ConductorForm />
                </ProtectedRoute>
              } 
            />
            <Route path="unit-history" element={<UnitHistory />} />
            <Route 
              path="audit-logs" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AuditLogs />
                </ProtectedRoute>
              } 
            />
          </Route>
        </Routes>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;
