import { NavLink, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, List, Users, Settings, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Users size={24} />
        <span>Olongapo PUV Profiler</span>
      </div>
      
      <nav className="sidebar-nav">
        <NavLink 
          to="/" 
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          end
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </NavLink>
        
        <NavLink
          to="/operators"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <Building2 size={20} />
          <span>Operators</span>
        </NavLink>
        <NavLink
          to="/drivers"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <List size={20} />
          <span>Driver List</span>
        </NavLink>
        <NavLink
          to="/monitoring"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <History size={20} />
          <span>Unit Monitoring</span>
        </NavLink>
        <button
          type="button"
          className="nav-item logout-item"
          onClick={handleLogout}
        >
          <Settings size={20} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
