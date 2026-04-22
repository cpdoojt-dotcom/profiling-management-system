import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Save, Trash2, X } from 'lucide-react';
import './DriverForm.css';

const initialOperator = {
  lastName: '',
  firstName: '',
  middleName: '',
  civilStatus: 'Single',
  birthdate: '',
  birthplace: '',
  age: '',
  addressNo: '',
  street: '',
  purok: '',
  barangay: '',
  cityMunicipality: '',
  contactNo: '',
  operatorType: 'FOR HIRE',
};

const initialUnit = {
  bodyNo: '',
  colorCode: '',
  makeType: '',
  chassisNo: '',
  motorNo: '',
  plateNo: '',
  yearModel: '',
  vehicleType: 'Tricycle',
  zone: '',
  ltfrbMchCaseNo: '',
};

const OperatorForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [operator, setOperator] = useState(initialOperator);
  const [units, setUnits] = useState([{ ...initialUnit }]);

  const handleOperatorChange = (e) => {
    const { name, value } = e.target;
    setOperator((prev) => ({ ...prev, [name]: value }));
  };

  const handleUnitChange = (index, field, value) => {
    setUnits((prev) => prev.map((unit, idx) => {
      if (idx === index) {
        let updated = { ...unit, [field]: value };
        // Auto-fill logic
        const bodyNo = (field === 'bodyNo' ? value : unit.bodyNo) || '';
        const vehicleType = field === 'vehicleType' ? value : unit.vehicleType;
        const firstChar = bodyNo.charAt(0);
        if (vehicleType === 'Tricycle') {
          if (bodyNo.startsWith('BB')) {
            updated.zone = 'BB';
          } else if (firstChar >= '1' && firstChar <= '9') {
            updated.zone = `Zone ${firstChar}`;
          }
        }
        return updated;
      }
      return unit;
    }));
  };

  const addUnit = () => {
    setUnits((prev) => [...prev, { ...initialUnit }]);
  };

  const removeUnit = (index) => {
    if (units.length === 1) return;
    setUnits((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const normalizedOperator = {
        ...operator,
        age: operator.age ? Number(operator.age) : undefined,
      };
      const normalizedUnits = units.map((unit) => ({
        ...unit,
      }));

      await axios.post('http://localhost:5000/api/operators', {
        operator: normalizedOperator,
        units: normalizedUnits,
      });
      navigate('/operators');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to save operator.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container animate-fade-in">
      <div className="form-header">
        <h1>Add Operator</h1>
        <p>Create an operator profile and register at least one unit.</p>
      </div>

      <form className="driver-form glass-panel" onSubmit={handleSubmit}>
        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid var(--danger)' }}>
            {error}
          </div>
        )}

        <h2 className="section-title">Operator Information</h2>
        <div className="form-grid">
          <div className="form-group">
            <label>Last Name</label>
            <input required type="text" name="lastName" className="input-field" value={operator.lastName} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>First Name</label>
            <input required type="text" name="firstName" className="input-field" value={operator.firstName} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Middle Name</label>
            <input type="text" name="middleName" className="input-field" value={operator.middleName} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Civil Status</label>
            <select name="civilStatus" className="input-field" value={operator.civilStatus} onChange={handleOperatorChange}>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
            </select>
          </div>
          <div className="form-group">
            <label>Birthdate</label>
            <input type="date" name="birthdate" className="input-field" value={operator.birthdate} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Birthplace</label>
            <input type="text" name="birthplace" className="input-field" value={operator.birthplace} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input type="number" min="0" name="age" className="input-field" value={operator.age} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Contact No.</label>
            <input type="text" name="contactNo" className="input-field" value={operator.contactNo} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Address No.</label>
            <input type="text" name="addressNo" className="input-field" value={operator.addressNo} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Street</label>
            <input type="text" name="street" className="input-field" value={operator.street} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Purok</label>
            <input type="text" name="purok" className="input-field" value={operator.purok} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Barangay</label>
            <input type="text" name="barangay" className="input-field" value={operator.barangay} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>City/Municipality</label>
            <input type="text" name="cityMunicipality" className="input-field" value={operator.cityMunicipality} onChange={handleOperatorChange} />
          </div>
          <div className="form-group">
            <label>Classification</label>
            <input 
              readOnly 
              className="input-field" 
              style={{ background: 'var(--surface-bg)', opacity: 0.7 }} 
              value={operator.operatorType} 
            />
          </div>
        </div>

        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Unit Information</span>
          <button className="btn-secondary" type="button" onClick={() => {
            const newUnit = { ...initialUnit, vehicleType: operator.operatorType };
            // Apply zone logic for the new unit if tricycle
            if (operator.operatorType === 'Tricycle') {
              // Leave zone empty as bodyNo is empty
            }
            setUnits(prev => [...prev, newUnit]);
          }}>
            <Plus size={16} />
            Add Another Unit
          </button>
        </div>

        {units.map((unit, index) => (
          <div key={`unit-${index}`} className="glass-panel" style={{ padding: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong>Unit #{index + 1}</strong>
              <button type="button" className="btn-danger" onClick={() => removeUnit(index)} disabled={units.length === 1}>
                <Trash2 size={16} />
                Remove
              </button>
            </div>
            <div className="form-grid" style={{ marginBottom: 0 }}>
              <div className="form-group">
                <label>Body No.</label>
                <input required type="text" className="input-field" value={unit.bodyNo} onChange={(e) => handleUnitChange(index, 'bodyNo', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Plate No.</label>
                <input type="text" className="input-field" value={unit.plateNo} onChange={(e) => handleUnitChange(index, 'plateNo', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Color Code</label>
                <input type="text" className="input-field" value={unit.colorCode} onChange={(e) => handleUnitChange(index, 'colorCode', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Make/Type</label>
                <input type="text" className="input-field" value={unit.makeType} onChange={(e) => handleUnitChange(index, 'makeType', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Chassis No.</label>
                <input type="text" className="input-field" value={unit.chassisNo} onChange={(e) => handleUnitChange(index, 'chassisNo', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Motor No.</label>
                <input type="text" className="input-field" value={unit.motorNo} onChange={(e) => handleUnitChange(index, 'motorNo', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Year Model</label>
                <input type="text" className="input-field" value={unit.yearModel} onChange={(e) => handleUnitChange(index, 'yearModel', e.target.value)} />
              </div>
              <div className="form-group">
                <label>Vehicle Category</label>
                <select 
                  className="input-field" 
                  value={unit.vehicleType} 
                  onChange={(e) => handleUnitChange(index, 'vehicleType', e.target.value)}
                >
                  <option value="Tricycle">Tricycle</option>
                  <option value="Jeepney">Jeepney</option>
                  <option value="Mini Bus">Mini Bus</option>
                </select>
              </div>
              {unit.vehicleType === 'Tricycle' && (
                <div className="form-group animate-fade-in" style={{ borderColor: 'var(--accent-color)' }}>
                  <label style={{ color: 'var(--accent-color)' }}>Tricycle Zone</label>
                  <input required type="text" className="input-field" style={{ borderColor: 'var(--accent-color)' }} value={unit.zone} placeholder="Enter Zone Name..." onChange={(e) => handleUnitChange(index, 'zone', e.target.value)} />
                </div>
              )}
              {(unit.vehicleType === 'Jeepney' || unit.vehicleType === 'Mini Bus') && (
                <div className="form-group animate-fade-in" style={{ borderColor: 'var(--accent-color)' }}>
                  <label style={{ color: 'var(--accent-color)' }}>LTFRB/MCH Case No.</label>
                  <input required type="text" className="input-field" style={{ borderColor: 'var(--accent-color)' }} value={unit.ltfrbMchCaseNo} placeholder="Enter Case Number..." onChange={(e) => handleUnitChange(index, 'ltfrbMchCaseNo', e.target.value)} />
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/operators')}>
            <X size={18} />
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={18} />
            {loading ? 'Saving...' : 'Save Operator'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OperatorForm;
