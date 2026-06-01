import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Shield, Bus, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
        localStorage.setItem('rememberedPassword', password);
      } else {
        localStorage.removeItem('rememberedEmail');
        localStorage.removeItem('rememberedPassword');
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to login. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleRememberMeChange = (e) => {
    const checked = e.target.checked;
    setRememberMe(checked);
    if (!checked) {
      localStorage.removeItem('rememberedEmail');
      localStorage.removeItem('rememberedPassword');
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>

      <div className="login-info">
        <h1>PUV Profiling Management System</h1>
        <p>
          A comprehensive platform for modernizing Public Utility Vehicle management.
          Centralized database for drivers, operators, conductors, and vehicle information.
        </p>
        <div className="info-features">
          <div className="feature-item">
            <Shield size={24} />
            <span>Secure & Reliable</span>
          </div>
          <div className="feature-item">
            <Bus size={24} />
            <span>Vehicle Management</span>
          </div>
          <div className="feature-item">
            <Truck size={24} />
            <span>Driver Profiling</span>
          </div>
        </div>
      </div>

      <div className="login-card glass-panel animate-fade-in">
        <div className="login-header">
          <div className="logo-icon">
            <svg viewBox="0 0 32 32" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
              {/* Shield base representing security/profiling */}
              <path d="M16 2 L28 6 L28 17 C28 24 22 28 16 30 C10 28 4 24 4 17 L4 6 Z" strokeWidth="1.8" opacity="0.8" />
              
              {/* PUV vehicle silhouette inside the shield */}
              {/* Destination board */}
              <rect x="12" y="8" width="8" height="3" rx="0.5" strokeWidth="1.2" fill="currentColor" fillOpacity="0.1" />
              
              {/* Windshield */}
              <rect x="10" y="12" width="12" height="6" rx="1.2" strokeWidth="1.5" />
              
              {/* Vehicle body */}
              <path d="M9 19 h14 v5 H9 Z" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
              
              {/* Headlights (Cyan glow to match modern styling) */}
              <circle cx="12" cy="21.5" r="0.8" fill="#06b6d4" stroke="none" />
              <circle cx="20" cy="21.5" r="0.8" fill="#06b6d4" stroke="none" />
              
              {/* Wheels / Bumper */}
              <path d="M11 24 v1.5 M21 24 v1.5" strokeWidth="1.5" />
              
              {/* Scanning Profiler bar - bright glowing neon emerald color */}
              <line x1="5" y1="15" x2="27" y2="15" stroke="#10b981" strokeWidth="2.2" />
            </svg>
          </div>
          <h1>PUV Profiling</h1>
          <p>Profiling Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '0.9rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--danger)' }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={rememberMe ? 'on' : 'off'}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={rememberMe ? 'on' : 'off'}
                required
              />
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-container">
              <input type="checkbox" checked={rememberMe} onChange={handleRememberMeChange} />
              <span className="checkmark"></span>
              Remember me
            </label>
            <a href="#" className="forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={isSubmitting}>
            <LogIn size={20} />
            {isSubmitting ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have an account? <a href="#">Contact Administrator</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
