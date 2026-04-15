import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, X } from 'lucide-react';
import './DriverForm.css';

const initialFormState = {
  operator: {
    bodyNo: '',
    lastName: '',
    firstName: '',
    middleName: '',
    civilStatus: '',
    age: '',
    addressNo: '',
    street: '',
    purok: '',
    barangay: '',
    cityMunicipality: '',
    contactNo: '',
    ltfrbMchCaseNo: '',
    colorCode: '',
    makeType: '',
    chassisNo: '',
    motorNo: '',
    plateNo: '',
    yearModel: '',
  },
  driver: {
    cpdoId: '',
    licenseNo: '',
    lastName: '',
    firstName: '',
    middleName: '',
    civilStatus: '',
    age: '',
    addressNo: '',
    street: '',
    purok: '',
    barangay: '',
    cityMunicipality: '',
    contactNo: '',
    birthMonth: '',
    birthDate: '',
    birthYear: '',
    status: 'Active',
  },
};

const DriverForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('operator_driver');
  const [operators, setOperators] = useState([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [driverImage, setDriverImage] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/operators');
        setOperators(res.data);
      } catch (_err) {
        // No blocking behavior; mode can still use operator+driver.
      }
    };
    fetchOperators();
  }, []);

  const handleChange = (section) => (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedOperator = {
        ...formData.operator,
        age: formData.operator.age ? Number(formData.operator.age) : undefined,
      };
      const normalizedDriver = {
        ...formData.driver,
        age: formData.driver.age ? Number(formData.driver.age) : undefined,
        birthDate: formData.driver.birthDate ? Number(formData.driver.birthDate) : undefined,
        birthYear: formData.driver.birthYear ? Number(formData.driver.birthYear) : undefined,
      };

      if (mode === 'operator_only') {
        await axios.post('http://localhost:5000/api/operators', normalizedOperator);
        navigate('/operators');
        return;
      }

      if (mode === 'driver_only') {
        if (!selectedOperatorId) {
          setError('Please select an existing operator first.');
          return;
        }
        const payload = new FormData();
        payload.append('driver', JSON.stringify({
          ...normalizedDriver,
          operator: selectedOperatorId,
        }));
        if (driverImage) {
          payload.append('driverImage', driverImage);
        }
        await axios.post('http://localhost:5000/api/drivers', payload);
        navigate('/drivers');
        return;
      }

      const payload = new FormData();
      payload.append('operator', JSON.stringify(normalizedOperator));
      payload.append('driver', JSON.stringify(normalizedDriver));
      if (driverImage) {
        payload.append('driverImage', driverImage);
      }
      await axios.post('http://localhost:5000/api/drivers', payload);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showOperatorSection = mode !== 'driver_only';
  const showDriverSection = mode !== 'operator_only';

  return (
    <div className="form-container animate-fade-in">
      <div className="form-header">
        <h1>Add Operator / Driver</h1>
        <p>Choose what to add: operator only, driver under existing operator, or operator + driver.</p>
      </div>

      <form className="driver-form glass-panel" onSubmit={handleSubmit}>
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}
        <div className="mode-box">
          <label htmlFor="mode">What do you want to add?</label>
          <select id="mode" className="input-field" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="operator_driver">Operator + Driver</option>
            <option value="operator_only">Operator only</option>
            <option value="driver_only">Driver under existing operator</option>
          </select>
        </div>

        {mode === 'driver_only' && (
          <div className="mode-box">
            <label htmlFor="operator-select">Select Operator</label>
            <select
              id="operator-select"
              className="input-field"
              value={selectedOperatorId}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              required
            >
              <option value="">Choose operator...</option>
              {operators.map((operator) => (
                <option key={operator._id} value={operator._id}>
                  {operator.firstName} {operator.lastName} | Body #{operator.bodyNo}
                </option>
              ))}
            </select>
          </div>
        )}

        {showOperatorSection && (
          <>
            <h2 className="section-title">Vehicle / Operator Information</h2>
            <div className="form-grid">
          <div className="form-group">
            <label>Body No.</label>
            <input required type="text" name="bodyNo" className="input-field" value={formData.operator.bodyNo} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input required type="text" name="lastName" className="input-field" value={formData.operator.lastName} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>First Name</label>
            <input required type="text" name="firstName" className="input-field" value={formData.operator.firstName} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Middle Name</label>
            <input type="text" name="middleName" className="input-field" value={formData.operator.middleName} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Civil Status</label>
            <input type="text" name="civilStatus" className="input-field" value={formData.operator.civilStatus} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" min="0" name="age" className="input-field" value={formData.operator.age} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Address No.</label>
            <input type="text" name="addressNo" className="input-field" value={formData.operator.addressNo} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Street</label>
            <input type="text" name="street" className="input-field" value={formData.operator.street} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Purok</label>
            <input type="text" name="purok" className="input-field" value={formData.operator.purok} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Barangay</label>
            <input type="text" name="barangay" className="input-field" value={formData.operator.barangay} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>City/Municipality</label>
            <input type="text" name="cityMunicipality" className="input-field" value={formData.operator.cityMunicipality} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Contact No.</label>
            <input type="text" name="contactNo" className="input-field" value={formData.operator.contactNo} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>LTFRB/MCH Case No.</label>
            <input type="text" name="ltfrbMchCaseNo" className="input-field" value={formData.operator.ltfrbMchCaseNo} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Color Code</label>
            <input type="text" name="colorCode" className="input-field" value={formData.operator.colorCode} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Make/Type</label>
            <input type="text" name="makeType" className="input-field" value={formData.operator.makeType} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Chassis No.</label>
            <input type="text" name="chassisNo" className="input-field" value={formData.operator.chassisNo} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Motor No.</label>
            <input type="text" name="motorNo" className="input-field" value={formData.operator.motorNo} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Plate No.</label>
            <input type="text" name="plateNo" className="input-field" value={formData.operator.plateNo} onChange={handleChange('operator')} />
          </div>
          <div className="form-group">
            <label>Year Model</label>
            <input type="text" name="yearModel" className="input-field" value={formData.operator.yearModel} onChange={handleChange('operator')} />
          </div>
        </div>
          </>
        )}

        {showDriverSection && (
          <>
            <h2 className="section-title">Driver Information</h2>
            <div className="form-group image-upload">
              <label>Driver Photo</label>
              <input
                type="file"
                accept="image/*"
                className="input-field"
                onChange={(e) => setDriverImage(e.target.files?.[0] || null)}
              />
            </div>
            <div className="form-grid">
          <div className="form-group">
            <label>CPDO ID</label>
            <input required type="text" name="cpdoId" className="input-field" value={formData.driver.cpdoId} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>License No.</label>
            <input required type="text" name="licenseNo" className="input-field" value={formData.driver.licenseNo} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input required type="text" name="lastName" className="input-field" value={formData.driver.lastName} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>First Name</label>
            <input required type="text" name="firstName" className="input-field" value={formData.driver.firstName} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Middle Name</label>
            <input type="text" name="middleName" className="input-field" value={formData.driver.middleName} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Civil Status</label>
            <input type="text" name="civilStatus" className="input-field" value={formData.driver.civilStatus} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" min="0" name="age" className="input-field" value={formData.driver.age} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Address No.</label>
            <input type="text" name="addressNo" className="input-field" value={formData.driver.addressNo} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Street</label>
            <input type="text" name="street" className="input-field" value={formData.driver.street} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Purok</label>
            <input type="text" name="purok" className="input-field" value={formData.driver.purok} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Barangay</label>
            <input type="text" name="barangay" className="input-field" value={formData.driver.barangay} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>City/Municipality</label>
            <input type="text" name="cityMunicipality" className="input-field" value={formData.driver.cityMunicipality} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Contact No.</label>
            <input type="text" name="contactNo" className="input-field" value={formData.driver.contactNo} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Birth Month</label>
            <input type="text" name="birthMonth" className="input-field" value={formData.driver.birthMonth} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Birth Date</label>
            <input type="number" min="1" max="31" name="birthDate" className="input-field" value={formData.driver.birthDate} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Birth Year</label>
            <input type="number" min="1900" max="2100" name="birthYear" className="input-field" value={formData.driver.birthYear} onChange={handleChange('driver')} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" className="input-field" value={formData.driver.status} onChange={handleChange('driver')}>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
          </>
        )}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
            <X size={18} />
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={18} />
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DriverForm;
