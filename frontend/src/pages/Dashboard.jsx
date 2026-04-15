import { Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1>Overview</h1>
        <p>Monitor your tricycle drivers profiling data in real-time.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Registered Drivers</h3>
            <p>1,248</p>
          </div>
        </div>
        
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.15)'}}>
            <ShieldCheck size={24} />
          </div>
          <div className="stat-details">
            <h3>Active Profiles</h3>
            <p>1,102</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.15)'}}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-details">
            <h3>Pending Renewals</h3>
            <p>146</p>
          </div>
        </div>
      </div>

      <div className="recent-section glass-panel">
        <h2>Recently Added Drivers</h2>
        <div className="empty-state">
          <p>No recent activity.</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
