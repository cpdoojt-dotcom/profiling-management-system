import { User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Header.css';

const Header = () => {
  const { user } = useAuth();

  return (
    <header className="header">
      <div className="header-title">Drivers Profiling Management</div>
      <div className="header-actions">
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
