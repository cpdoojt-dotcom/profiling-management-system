import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Save, X } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import './DriverForm.css'; // Reusing driver form styles

const initialConductor = {
  lastName: '',
  firstName: '',
  middleName: '',
  extensionName: '',
  civilStatus: '',
  gender: 'Male',
  addressNo: '',
  street: '',
  purok: '',
  barangay: '',
  cityMunicipality: '',
  contactNo: '',
  birthMonth: '',
  birthDate: '',
  birthYear: '',
  birthPlace: '',
  emergencyContactName: '',
  emergencyContactNo: '',
  emergencyContactAddress: '',
  status: 'Active',
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

const ConductorForm = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [operators, setOperators] = useState([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [conductorImage, setConductorImage] = useState(null);
  const [conductor, setConductor] = useState(initialConductor);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/operators');
        const miniBusOperators = res.data.filter(op => 
          op.operatorType === 'Mini Bus' || (op.units && op.units.some(u => u.vehicleType === 'Mini Bus'))
        );
        setOperators(miniBusOperators);
        if (miniBusOperators[0]?._id) {
          setSelectedOperatorId(miniBusOperators[0]._id);
        }
      } catch (_err) {
        // Handle error
      }
    };
    fetchOperators();
  }, []);

  useEffect(() => {
    const selectedOperator = operators.find((operator) => operator._id === selectedOperatorId);
    const miniBusUnits = (selectedOperator?.units || []).filter(u => u.vehicleType === 'Mini Bus');
    const nextUnitId = miniBusUnits[0]?._id || '';
    setSelectedUnitId(nextUnitId);
  }, [selectedOperatorId, operators]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Fields that should only contain letters and spaces
    const letterOnlyFields = ['lastName', 'firstName', 'middleName', 'extensionName', 'civilStatus', 'birthMonth', 'birthPlace', 'emergencyContactName'];
    if (letterOnlyFields.includes(name)) {
      finalValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    // Fields that should only contain numbers
    if (name === 'emergencyContactNo' || name === 'contactNo') {
      finalValue = value.replace(/\D/g, '');
    }

    // Standardize to uppercase for consistency
    const uppercaseFields = ['lastName', 'firstName', 'middleName', 'extensionName', 'civilStatus', 'birthMonth', 'birthPlace', 'emergencyContactName', 'addressNo', 'street', 'purok', 'barangay', 'cityMunicipality'];
    if (uppercaseFields.includes(name)) {
      finalValue = finalValue.toUpperCase();
    }

    setConductor((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!await confirm('Are you sure you want to add this new Conductor?')) return;
    setLoading(true);
    setError('');
    try {
      const normalizedConductor = {
        ...conductor,
        birthDate: conductor.birthDate ? Number(conductor.birthDate) : undefined,
        birthYear: conductor.birthYear ? Number(conductor.birthYear) : undefined,
      };

      if (!selectedOperatorId || !selectedUnitId) {
        setError('Please select an operator and a unit (Mini Bus) first.');
        return;
      }

      const payload = new FormData();
      payload.append('conductor', JSON.stringify({
        ...normalizedConductor,
        operator: selectedOperatorId,
        unit: selectedUnitId,
      }));
      if (conductorImage) {
        payload.append('conductorImage', conductorImage);
      }
      await axios.post('http://localhost:5000/api/conductors', payload);
      toast.success('Conductor registered successfully!');
      navigate('/conductors');
    } catch (err) {
      const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const selectedOperator = operators.find((operator) => operator._id === selectedOperatorId);
  const availableUnits = (selectedOperator?.units || []).filter(u => u.vehicleType === 'Mini Bus');

  return (
    <div className="form-container animate-fade-in">
      <div className="form-header">
        <h1>Add Conductor</h1>
        <p>Select a Mini Bus unit and register the conductor profile.</p>
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
          <label htmlFor="unit-select">Select Mini Bus Unit</label>
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

        <h2 className="section-title">Conductor Information</h2>
        <div className="form-group image-upload">
          <label>Conductor Photo</label>
          <input
            type="file"
            accept="image/*"
            className="input-field"
            onChange={(e) => setConductorImage(e.target.files?.[0] || null)}
          />
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Last Name</label>
            <input required type="text" name="lastName" className="input-field" value={conductor.lastName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>First Name</label>
            <input required type="text" name="firstName" className="input-field" value={conductor.firstName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Middle Name</label>
            <input type="text" name="middleName" className="input-field" value={conductor.middleName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Extension Name (Jr., Sr., III)</label>
            <input type="text" name="extensionName" className="input-field" value={conductor.extensionName} onChange={handleChange} placeholder="e.g. JR, SR, III" />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select name="gender" className="input-field" value={conductor.gender} onChange={handleChange}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label>Civil Status</label>
            <input type="text" name="civilStatus" className="input-field" value={conductor.civilStatus} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Birth Month</label>
            <select name="birthMonth" className="input-field" value={conductor.birthMonth} onChange={handleChange}>
              <option value="">-- Month --</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Birth Date</label>
            <input type="number" min="1" max="31" name="birthDate" className="input-field" value={conductor.birthDate} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Birth Year</label>
            <input type="number" min="1900" max="2100" name="birthYear" className="input-field" value={conductor.birthYear} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Birth Place</label>
            <input type="text" name="birthPlace" className="input-field" value={conductor.birthPlace} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Address No.</label>
            <input type="text" name="addressNo" className="input-field" value={conductor.addressNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Street</label>
            <input type="text" name="street" className="input-field" value={conductor.street} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Purok</label>
            <input type="text" name="purok" className="input-field" value={conductor.purok} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Barangay</label>
            <input type="text" name="barangay" className="input-field" value={conductor.barangay} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>City/Municipality</label>
            <input type="text" name="cityMunicipality" className="input-field" value={conductor.cityMunicipality} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Contact No.</label>
            <input type="text" name="contactNo" className="input-field" value={conductor.contactNo} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select name="status" className="input-field" value={conductor.status} onChange={handleChange}>
              <option value="Active">Active</option>
              <option value="Pending">Pending</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        <h2 className="section-title">Emergency Contact Information</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Person to Notify</label>
            <input type="text" name="emergencyContactName" className="input-field" value={conductor.emergencyContactName} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label>Contact No.</label>
            <input type="text" name="emergencyContactNo" className="input-field" value={conductor.emergencyContactNo} onChange={handleChange} />
          </div>
          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label>Emergency Contact Address</label>
            <input type="text" name="emergencyContactAddress" className="input-field" value={conductor.emergencyContactAddress} onChange={handleChange} />
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/conductors')}>
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

export default ConductorForm;
