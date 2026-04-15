import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, Settings } from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Users size={24} />
        <span>Tricycle Profiler</span>
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
          to="/drivers/new" 
          className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
        >
          <UserPlus size={20} />
          <span>Add Driver</span>
        </NavLink>
        <NavLink 
          to="/login" 
          className="nav-item logout-item"
        >
          <Settings size={20} />
          <span>Logout</span>
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;
