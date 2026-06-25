import { NavLink, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, List, Users, LogOut, History, ScrollText, PanelLeftClose, PanelLeftOpen, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../context/ConfirmContext';
import './Sidebar.css';

const Sidebar = ({ isCollapsed, onToggleCollapse }) => {
  const { logout, user } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const approved = await confirm('Are you sure you want to log out?');
    if (!approved) return;
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-brand">
        <div className="sidebar-brand-main">
          <img src="/favicon.svg" alt="PUV Profiling Logo" className="sidebar-logo" />
          <span>PUV Profiling</span>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
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
          to="/conductors"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <Users size={20} />
          <span>Conductor List</span>
        </NavLink>
        <NavLink
          to="/unit-history"
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <History size={20} />
          <span>Unit History</span>
        </NavLink>
        {user?.role !== 'otmps' && (
          <NavLink
            to="/audit-logs"
            className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
          >
            <ScrollText size={20} />
            <span>System Logs</span>
          </NavLink>
        )}
        <button
          type="button"
          className="nav-item logout-item"
          onClick={handleLogout}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;
