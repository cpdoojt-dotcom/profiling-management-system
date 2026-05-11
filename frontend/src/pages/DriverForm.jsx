import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, X } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import './DriverForm.css';

const initialDriver = {
  cpdoId: '',
  licenseNo: '',
  licenseExpiryDate: '',
  lastName: '',
  firstName: '',
  middleName: '',
  extensionName: '',
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
  driverType: 'Tricycle',
};

const getFullName = (person) => {
  if (!person) return '';
  const parts = [person.firstName, person.middleName, person.lastName];
  if (person.extensionName) parts.push(person.extensionName);
  return parts
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

const DriverForm = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [driverImage, setDriverImage] = useState(null);
  const [driver, setDriver] = useState(initialDriver);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/operators');
        setOperators(res.data);
        if (res.data[0]?._id) {
          setSelectedOperatorId(res.data[0]._id);
          setSelectedUnitId(res.data[0]?.units?.[0]?._id || '');
        }
      } catch (_err) {
        // Form remains visible and error appears on submit.
      }
    };
    fetchOperators();
  }, []);

  useEffect(() => {
    const selectedOperator = operators.find((operator) => operator._id === selectedOperatorId);
    const firstUnit = selectedOperator?.units?.[0];
    const nextUnitId = firstUnit?._id || '';
    setSelectedUnitId(nextUnitId);
    
    // Auto-set driverType based on unit's vehicle category if available
    if (firstUnit?.vehicleType) {
      setDriver(prev => ({ ...prev, driverType: firstUnit.vehicleType }));
    }
  }, [selectedOperatorId, operators]);

  useEffect(() => {
    const selectedOperator = operators.find((operator) => operator._id === selectedOperatorId);
    const selectedUnit = selectedOperator?.units?.find(u => u._id === selectedUnitId);
    if (selectedUnit?.vehicleType) {
      setDriver(prev => ({ ...prev, driverType: selectedUnit.vehicleType }));
    }
  }, [selectedUnitId, selectedOperatorId, operators]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Fields that should only contain letters and spaces
    const letterOnlyFields = ['lastName', 'firstName', 'middleName', 'extensionName', 'civilStatus', 'barangay', 'cityMunicipality', 'birthMonth'];
    if (letterOnlyFields.includes(name)) {
      finalValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    // Fields that should only contain numbers
    if (name === 'contactNo') {
      finalValue = value.replace(/\D/g, '');
    }

    const uppercaseFields = [
      'cpdoId', 'licenseNo', 'lastName', 'firstName', 'middleName', 'extensionName',
      'civilStatus', 'barangay', 'cityMunicipality', 'street', 'purok', 'birthMonth'
    ];
    if (uppercaseFields.includes(name)) {
      finalValue = finalValue.toUpperCase();
    }
    setDriver((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!await confirm('Are you sure you want to add this new Driver?')) return;
    setLoading(true);
    setError('');
    try {
      const normalizedDriver = {
        ...driver,
        age: driver.age ? Number(driver.age) : undefined,
        birthDate: driver.birthDate ? Number(driver.birthDate) : undefined,
        birthYear: driver.birthYear ? Number(driver.birthYear) : undefined,
      };

      if (!selectedOperatorId || !selectedUnitId) {
        setError('Please select an operator and a unit first.');
        return;
      }

      const payload = new FormData();
      payload.append('driver', JSON.stringify({
        ...normalizedDriver,
        operator: selectedOperatorId,
        unit: selectedUnitId,
      }));
      if (driverImage) {
        payload.append('driverImage', driverImage);
      }
      await axios.post('http://localhost:5000/api/drivers', payload);
      toast.success('Driver registered successfully!');
      navigate('/drivers');
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedOperator = operators.find((operator) => operator._id === selectedOperatorId);
  const availableUnits = selectedOperator?.units || [];

  return (
    <div className="form-container animate-fade-in">
      <div className="form-header">
        <h1>Add Driver</h1>
        <p>Select an operator and unit, then register the driver profile.</p>
      </div>

      <form className="driver-form glass-panel" onSubmit={handleSubmit}>
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}
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
                {getFullName(operator)}
              </option>
            ))}
          </select>
        </div>

        <div className="mode-box">
          <label htmlFor="unit-select">Select Unit</label>
          <select
            id="unit-select"
            className="input-field"
            value={selectedUnitId}
            onChange={(e) => setSelectedUnitId(e.target.value)}
            required
            disabled={!selectedOperatorId}
          >
            <option value="">Choose unit...</option>
            {availableUnits.map((unit) => (
              <option key={unit._id} value={unit._id}>
                Body #{unit.bodyNo} | Plate {unit.plateNo || '-'}
              </option>
            ))}
          </select>
        </div>

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
            <input required type="text" name="cpdoId" className="input-field" value={driver.cpdoId} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>License No.</label>
            <input required type="text" name="licenseNo" className="input-field" value={driver.licenseNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>License Expiry Date</label>
            <input type="date" name="licenseExpiryDate" className="input-field" value={driver.licenseExpiryDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Last Name</label>
            <input required type="text" name="lastName" className="input-field" value={driver.lastName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>First Name</label>
            <input required type="text" name="firstName" className="input-field" value={driver.firstName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Middle Name</label>
            <input type="text" name="middleName" className="input-field" value={driver.middleName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Extension Name (Jr., Sr., III)</label>
            <input type="text" name="extensionName" className="input-field" value={driver.extensionName} onChange={handleChange} placeholder="e.g. JR, SR, III" />
          </div>
          <div className="form-group">
            <label>Civil Status</label>
            <input type="text" name="civilStatus" className="input-field" value={driver.civilStatus} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" min="0" name="age" className="input-field" value={driver.age} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Address No.</label>
            <input type="text" name="addressNo" className="input-field" value={driver.addressNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Street</label>
            <input type="text" name="street" className="input-field" value={driver.street} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Purok</label>
            <input type="text" name="purok" className="input-field" value={driver.purok} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Barangay</label>
            <input type="text" name="barangay" className="input-field" value={driver.barangay} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>City/Municipality</label>
            <input type="text" name="cityMunicipality" className="input-field" value={driver.cityMunicipality} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Contact No.</label>
            <input type="text" name="contactNo" className="input-field" value={driver.contactNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Birth Month</label>
            <input type="text" name="birthMonth" className="input-field" value={driver.birthMonth} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Birth Date</label>
            <input type="number" min="1" max="31" name="birthDate" className="input-field" value={driver.birthDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Birth Year</label>
            <input type="number" min="1900" max="2100" name="birthYear" className="input-field" value={driver.birthYear} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" className="input-field" value={driver.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group">
            <label>Driver Classification</label>
            <select 
              name="driverType" 
              className="input-field" 
              value={driver.driverType} 
              onChange={handleChange}
            >
              <option value="Tricycle">Tricycle</option>
              <option value="Jeepney">Jeepney</option>
              <option value="Mini Bus">Mini Bus</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/drivers')}>
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
