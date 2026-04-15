import { User } from 'lucide-react';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="header-title">Drivers Profiling Management</div>
      <div className="header-actions">
        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <span>Admin</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
