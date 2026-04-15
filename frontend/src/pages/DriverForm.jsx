import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, X } from 'lucide-react';
import './DriverForm.css';

const DriverForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    licenseNo: '',
    toda: '',
    plateNo: '',
    contactNo: '',
    address: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({...prev, [name]: value}));
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await axios.post('http://localhost:5000/api/drivers', formData);
      navigate('/drivers');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="form-container animate-fade-in">
      <div className="form-header">
        <h1>Add New Driver</h1>
        <p>Enter the driver's profiling details below.</p>
      </div>

      <form className="driver-form glass-panel" onSubmit={handleSubmit}>
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}
        <div className="form-grid">
          
          <div className="form-group">
            <label>First Name</label>
            <input required type="text" name="firstName" className="input-field" value={formData.firstName} onChange={handleChange} placeholder="Juan" />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input required type="text" name="lastName" className="input-field" value={formData.lastName} onChange={handleChange} placeholder="Dela Cruz" />
          </div>

          <div className="form-group">
            <label>License Number</label>
            <input required type="text" name="licenseNo" className="input-field" value={formData.licenseNo} onChange={handleChange} placeholder="N11-12-123456" />
          </div>

          <div className="form-group">
            <label>TODA</label>
            <select required name="toda" className="input-field" value={formData.toda} onChange={handleChange}>
              <option value="">Select TODA...</option>
              <option value="NORTH TODA">NORTH TODA</option>
              <option value="SOUTH TODA">SOUTH TODA</option>
              <option value="EAST TODA">EAST TODA</option>
              <option value="WEST TODA">WEST TODA</option>
            </select>
          </div>

          <div className="form-group">
            <label>Tricycle Plate Number</label>
            <input required type="text" name="plateNo" className="input-field" value={formData.plateNo} onChange={handleChange} placeholder="AB 1234" />
          </div>

          <div className="form-group">
            <label>Contact Number</label>
            <input type="text" name="contactNo" className="input-field" value={formData.contactNo} onChange={handleChange} placeholder="0917 123 4567" />
          </div>

          <div className="form-group full-width">
            <label>Address</label>
            <textarea name="address" className="input-field" rows="3" value={formData.address} onChange={handleChange} placeholder="Complete Address"></textarea>
          </div>

        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/drivers')}>
            <X size={18} />
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverForm;
