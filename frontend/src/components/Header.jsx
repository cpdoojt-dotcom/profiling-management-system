import { useEffect, useState } from 'react';
import { Menu, PanelLeftClose, User, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Header.css';

const Header = ({ isSidebarCollapsed, onToggleSidebar }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [philippineTime, setPhilippineTime] = useState('');
  const [philippineDate, setPhilippineDate] = useState('');

  useEffect(() => {
    const updatePhilippineDateTime = () => {
      const now = new Date();
      const time = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);

      const date = new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(now);

      setPhilippineTime(time);
      setPhilippineDate(date);
    };

    updatePhilippineDateTime();
    const intervalId = setInterval(updatePhilippineDateTime, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <header className="header">
      <button
        type="button"
        className="mobile-sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label={isSidebarCollapsed ? 'Open sidebar' : 'Close sidebar'}
      >
        {isSidebarCollapsed ? <Menu size={18} /> : <PanelLeftClose size={18} />}
      </button>
      <div className="header-title">Operators & Drivers Profiling Management</div>
      <div className="header-actions">
        <div className="ph-datetime" aria-label="Current date and time in the Philippines">
          <span className="ph-time">{philippineTime}</span>
          <span className="ph-date">{philippineDate}</span>
        </div>
        
        <button 
          className="theme-toggle-btn" 
          onClick={toggleTheme} 
          aria-label="Toggle dark/light mode"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <span>{user?.name || user?.email || 'Admin'}</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
