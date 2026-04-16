import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const [drivers, setDrivers] = useState([]);
  const [summary, setSummary] = useState({ drivers: 0, operators: 0, vehicles: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const [driversRes, summaryRes] = await Promise.all([
          axios.get('http://localhost:5000/api/drivers'),
          axios.get('http://localhost:5000/api/drivers/meta/summary'),
        ]);
        setDrivers(driversRes.data);
        setSummary(summaryRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  const recentDrivers = useMemo(() => drivers.slice(0, 5), [drivers]);

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <h1>Overview</h1>
        <p>Monitor your PUV operators, vehicles, and drivers in real-time.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Registered Drivers</h3>
            <p>{summary.drivers}</p>
          </div>
        </div>
        
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.15)'}}>
            <ShieldCheck size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Operators</h3>
            <p>{summary.operators}</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.15)'}}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-details">
            <h3>Total PUV Units</h3>
            <p>{summary.vehicles}</p>
          </div>
        </div>
      </div>

      <div className="recent-section glass-panel">
        <div className="recent-header">
          <h2>Recently Added Drivers</h2>
          <Link to="/drivers" className="drivers-link">View all</Link>
        </div>
        {loading ? (
          <div className="empty-state">
            <p>Loading latest drivers...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <p>{error}</p>
          </div>
        ) : recentDrivers.length === 0 ? (
          <div className="empty-state">
            <p>No drivers added yet.</p>
          </div>
        ) : (
          <div className="recent-list">
            {recentDrivers.map((driver) => (
              <Link className="recent-item" key={driver._id} to={`/drivers?driverId=${driver._id}`}>
                <div className="recent-left">
                  {driver.photoUrl ? (
                    <img src={driver.photoUrl} alt={`${driver.firstName} ${driver.lastName}`} className="driver-thumb" />
                  ) : (
                    <div className="driver-thumb-placeholder">
                      {(driver.firstName?.[0] || '').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="recent-center">
                  <h3>{driver.firstName} {driver.lastName}</h3>
                  <p>{driver.licenseNo} | Body #{driver.unit?.bodyNo || '-'} | Plate {driver.unit?.plateNo || '-'}</p>
                </div>
                <span className="status-chip">{driver.status || 'Active'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
