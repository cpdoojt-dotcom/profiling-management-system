import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, History, ArrowRight, User, MapPin, Truck, Edit, X, Save, Bike, Bus } from 'lucide-react';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import './UnitMonitoring.css';

const getColorOptions = (bodyNo, vehicleType) => {
  if (!bodyNo) return [];
  const bn = bodyNo.toUpperCase();
  if (vehicleType === 'Tricycle') {
    if (bn.startsWith('1')) return ['ORANGE'];
    if (bn.startsWith('2')) return ['GREEN'];
    if (bn.startsWith('3')) return ['BLUE'];
    if (bn.startsWith('4')) return ['BROWN'];
    if (bn.startsWith('BB')) return ['SILVER'];
    if (bn.startsWith('5')) return ['CREAM'];
    if (bn.startsWith('6')) return ['YELLOW'];
    if (bn.startsWith('7')) return ['RED'];
    if (bn.startsWith('8')) return ['SKYBLUE W/ CREAM TOP'];
    if (bn.startsWith('9')) return ['SKY BLUE W/RED TOP'];
  } else if (vehicleType === 'Jeepney') {
    if (bn.startsWith('JO1')) return ['YELLOW'];
    if (bn.startsWith('JO2')) return ['ORANGE'];
    if (bn.startsWith('JO3')) return ['RED'];
    if (bn.startsWith('JO4')) return ['YELLOW GREEN'];
    if (bn.startsWith('JO5')) return ['CREAM'];
    if (bn.startsWith('JO6')) return ['BROWN'];
    if (bn.startsWith('JO7')) return ['GREEN W/WHITE TOP'];
    if (bn.startsWith('JO8')) return ['DARKBLUE', 'DARKBLUE W/ YELLOW TOP'];
    if (bn.startsWith('JO9')) return ['SKYBLUE', 'SKYBLUE W/ WHITE TOP'];
    if (bn.startsWith('J10') || bn.startsWith('J11')) return ['YELLOW W/RED TOP'];
    if (bn.startsWith('J12') || bn.startsWith('J13')) return ['SKYBLUE W/GOLD TOP'];
  } else if (vehicleType === 'Mini Bus') {
    if (bn.startsWith('O-B')) return ['DIRTY WHITE WITH GREEN STRIPES'];
    if (bn.startsWith('O-Z')) return ['WHITE WITH BLUE STRIPES'];
  }
  return [];
};

const UnitMonitoring = () => {
  const confirm = useConfirm();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [units, setUnits] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [history, setHistory] = useState([]);
  const [assignedDrivers, setAssignedDrivers] = useState([]);
  const [assignedConductors, setAssignedConductors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [operators, setOperators] = useState([]);
  const [driversList, setDriversList] = useState([]);
  const [conductorsList, setConductorsList] = useState([]);
  const [editFormData, setEditFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [unitsRes, opsRes, driversRes, conductorsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/units'),
        axios.get('http://localhost:5000/api/operators'),
        axios.get('http://localhost:5000/api/drivers'),
        axios.get('http://localhost:5000/api/conductors')
      ]);

      // Cross-reference drivers with units to fill in "Unassigned" gaps visually
      const allUnits = unitsRes.data;
      const allDrivers = driversRes.data;

      const enhancedUnits = allUnits.map(unit => {
        if (!unit.driver) {
          const linkedDriver = allDrivers.find(d => d.unit?._id === unit._id || d.unit === unit._id);
          if (linkedDriver) {
            return { ...unit, assignedDriverName: `${linkedDriver.firstName} ${linkedDriver.lastName}` };
          }
        }
        return unit;
      });

      setUnits(enhancedUnits);
      setOperators(opsRes.data);
      setDriversList(allDrivers);
      setConductorsList(conductorsRes.data);
    } catch (err) {
      setError('Unable to load monitoring data.');
    } finally {
      setLoading(false);
    }
  };

  const searchUnits = async (e) => {
    e.preventDefault();
    setError('');
    if (!query.trim()) {
      fetchInitialData();
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/units/search/${query}`);
      setUnits(res.data);
      if (res.data.length === 0) setError('No units found with that body or plate number.');
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const viewHistory = async (unit) => {
    setSelectedUnit(unit);
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/units/history/${unit.bodyNo}`);
      setHistory(res.data.history || []);
      setAssignedDrivers(res.data.drivers || []);
      setAssignedConductors(res.data.conductors || []);
    } catch (err) {
      setError('Failed to load history.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    // Find if there's an assigned driver we can suggest
    const suggestedDriverId = !selectedUnit.driver ? (assignedDrivers[0]?._id || '') : (selectedUnit.driver?._id || selectedUnit.driver || '');

    setEditFormData({
      bodyNo: selectedUnit.bodyNo,
      plateNo: selectedUnit.plateNo || '',
      vehicleType: selectedUnit.vehicleType || 'Tricycle',
      zone: selectedUnit.zone || '',
      conductor: selectedUnit.conductor?._id || selectedUnit.conductor || '',
      operator: selectedUnit.operator?._id || selectedUnit.operator,
      driver: suggestedDriverId,
      makeType: selectedUnit.makeType || '',
      yearModel: selectedUnit.yearModel || '',
      chassisNo: selectedUnit.chassisNo || '',
      motorNo: selectedUnit.motorNo || '',
      colorCode: selectedUnit.colorCode || '',
      ltfrbMchCaseNo: selectedUnit.ltfrbMchCaseNo || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!await confirm('Are you sure you want to save changes to this unit?')) return;
    setSaving(true);
    try {
      const res = await axios.put(`http://localhost:5000/api/units/${selectedUnit._id}`, editFormData);
      const updatedUnit = { ...selectedUnit, ...res.data };
      const ops = operators.find(o => o._id === editFormData.operator);
      const drv = driversList.find(d => d._id === editFormData.driver);
      updatedUnit.operator = ops; 
      updatedUnit.driver = drv;
      setSelectedUnit(updatedUnit);
      await viewHistory(updatedUnit);
      toast.success('Unit information updated successfully!');
      setShowEditModal(false);
      fetchInitialData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update unit properly.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const DiffRow = ({ label, oldVal, newVal }) => {
    const isChanged = oldVal !== newVal;
    if (!isChanged && !oldVal) return null;

    return (
      <tr className="diff-row">
        <th>{label}</th>
        <td>
          {isChanged ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="diff-old">{oldVal || '(Empty)'}</span>
              <ArrowRight size={14} />
              <span className="diff-new">{newVal || '(Empty)'}</span>
            </div>
          ) : (
            <span className="no-change">{newVal}</span>
          )}
        </td>
      </tr>
    );
  };

  const getVehicleIcon = (type, size = 16) => {
    switch (type) {
      case 'Tricycle': return <Bike size={size} />;
      case 'Jeepney': return <Truck size={size} />;
      case 'Mini Bus': return <Bus size={size} />;
      default: return <Truck size={size} />;
    }
  };

  return (
    <div className="monitoring-page animate-fade-in">
      <div className="monitoring-header">
        <h1>Unit Monitoring & Lifecycle</h1>
        <p>Track the history and changes of any vehicle by its Body Number.</p>
      </div>

      <div className="monitoring-search-wrap">
        <form style={{ display: 'flex', flexGrow: 1, gap: '1rem' }} onSubmit={searchUnits}>
          <input 
            type="text" 
            placeholder="Enter Body Number or Plate Number..." 
            className="input-field"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value.trim()) setError('');
            }}
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            <Search size={18} />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        <select 
          className="input-field" 
          style={{ maxWidth: '200px' }} 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="all">All Unit Types</option>
          <option value="Tricycle">Tricycle</option>
          <option value="Jeepney">Jeepney</option>
          <option value="Mini Bus">Mini Bus</option>
        </select>
      </div>

      {error && <p className="action-error">{error}</p>}

      {!selectedUnit && (
        <div className="monitoring-content">
          {loading ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <p>Loading units...</p>
            </div>
          ) : units.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
              <Truck size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>No units registered in the system yet.</p>
            </div>
          ) : (
            <>
              {units.filter(u => filterType === 'all' || u.vehicleType === filterType).length > 0 ? (
                <div className="search-results">
                  {units
                    .filter(u => filterType === 'all' || u.vehicleType === filterType)
                    .map(unit => (
                    <div key={unit._id} className="glass-panel unit-card" onClick={() => viewHistory(unit)}>
                      <h3>Body #{unit.bodyNo}</h3>
                      <p>{getVehicleIcon(unit.vehicleType)} {unit.vehicleType}</p>
                      <p><User size={14} /> <strong>Owner:</strong> {unit.operator?.firstName} {unit.operator?.lastName}</p>
                      <p>
                        <User size={14} style={{ color: 'var(--accent-color)' }} /> 
                        <strong>Driver:</strong> {
                          unit.driver ? `${unit.driver.firstName} ${unit.driver.lastName}` : 
                          (unit.assignedDriverName ? unit.assignedDriverName : 'Unassigned')
                        }
                      </p>
                      {unit.vehicleType === 'Mini Bus' && (
                        <p>
                          <User size={14} style={{ color: 'var(--accent-color)' }} /> 
                          <strong>Conductor:</strong> {
                            unit.conductor ? `${unit.conductor.firstName} ${unit.conductor.lastName}` : 'Unassigned'
                          }
                        </p>
                      )}
                      <p><MapPin size={14} /> {unit.zone || 'No Zone'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
                  <div style={{ opacity: 0.2, marginBottom: '1rem' }}>
                    {getVehicleIcon(filterType, 48)}
                  </div>
                  <p>No {filterType} units found.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {selectedUnit && (
        <div className="timeline-section">
          <div className="details-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h2>Body #{selectedUnit.bodyNo} Log</h2>
              <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} onClick={handleEditClick}>
                <Edit size={16} /> Manage & Edit
              </button>
            </div>
            <button className="btn-secondary" onClick={() => setSelectedUnit(null)}>Back to Overview</button>
          </div>

          {assignedDrivers.length > 0 && (
            <div className="assigned-drivers-list glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--accent-color)' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <User size={18} /> Currently Assigned Drivers ({assignedDrivers.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {assignedDrivers.map(drv => (
                  <div key={drv._id} className="driver-mini-card" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#fff' }}>{drv.firstName} {drv.lastName}</strong>
                    <span style={{ fontSize: '0.85rem', opacity: 0.7 }}>License: {drv.licenseNo}</span>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: 'var(--accent-color)', fontWeight: '600' }}>Status: {drv.status || 'Active'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignedConductors.length > 0 && (
            <div className="assigned-drivers-list glass-panel" style={{ marginBottom: '2rem', padding: '1.5rem', borderLeft: '4px solid var(--accent-color)' }}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <User size={18} /> Currently Assigned Conductors ({assignedConductors.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {assignedConductors.map(cond => (
                  <div key={cond._id} className="driver-mini-card" style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#fff' }}>{cond.firstName} {cond.lastName}</strong>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: 'var(--accent-color)', fontWeight: '600' }}>Status: {cond.status || 'Active'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p>No history records found for this unit.</p>
            </div>
          ) : (
            <div className="timeline">
              {history.map((log) => (
                <div key={log._id} className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="glass-panel timeline-content">
                    <div className="log-header">
                      <span className="log-type">{log.summary || log.changeType}</span>
                      <span className="log-date">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>

                    <table className="diff-table">
                      <tbody>
                        <DiffRow label="Operator" oldVal={log.oldData?.operatorName} newVal={log.newData?.operatorName} />
                        <DiffRow label="Driver" oldVal={log.oldData?.driverName} newVal={log.newData?.driverName} />
                        <DiffRow label="Category" oldVal={log.oldData?.vehicleType} newVal={log.newData?.vehicleType} />
                        <DiffRow label="Plate No" oldVal={log.oldData?.plateNo} newVal={log.newData?.plateNo} />
                        <DiffRow label="Make/Type" oldVal={log.oldData?.makeType} newVal={log.newData?.makeType} />
                        <DiffRow label="Color Code" oldVal={log.oldData?.colorCode} newVal={log.newData?.colorCode} />
                        <DiffRow label="Year Model" oldVal={log.oldData?.yearModel} newVal={log.newData?.yearModel} />
                        <DiffRow label="Chassis No" oldVal={log.oldData?.chassisNo} newVal={log.newData?.chassisNo} />
                        <DiffRow label="Motor No" oldVal={log.oldData?.motorNo} newVal={log.newData?.motorNo} />
                        <DiffRow label="Zone" oldVal={log.oldData?.zone} newVal={log.newData?.zone} />
                        <DiffRow label="LTFRB Case" oldVal={log.oldData?.ltfrbMchCaseNo} newVal={log.newData?.ltfrbMchCaseNo} />
                        <DiffRow label="Conductor" oldVal={log.oldData?.conductorName} newVal={log.newData?.conductorName} />
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Edit Unit Information</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body driver-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Body Number (Fixed)</label>
                    <input type="text" className="input-field" value={editFormData.bodyNo} disabled style={{ background: 'var(--surface-bg)', opacity: 0.7 }} />
                  </div>
                  <div className="form-group">
                    <label>Current Operator</label>
                    <select 
                      className="input-field" 
                      value={editFormData.operator} 
                      onChange={e => {
                        const opId = e.target.value;
                        const op = operators.find(o => o._id === opId);
                        const updated = { ...editFormData, operator: opId };
                        // No longer syncing with operatorType as it's now 'FOR HIRE'
                        setEditFormData(updated);
                      }}
                    >
                      {operators.map(op => (
                        <option key={op._id} value={op._id}>{op.firstName} {op.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Current Driver</label>
                    <select className="input-field" value={editFormData.driver} onChange={e => setEditFormData({...editFormData, driver: e.target.value})}>
                      <option value="">-- No Driver Assigned --</option>
                      {driversList.map(drv => {
                        const isAssigned = assignedDrivers.some(ad => ad._id === drv._id);
                        return (
                          <option key={drv._id} value={drv._id}>
                            {drv.firstName} {drv.lastName} {isAssigned ? '(Assigned to this Unit)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vehicle Type</label>
                    <select 
                      className="input-field" 
                      value={editFormData.vehicleType} 
                      onChange={e => {
                        const val = e.target.value;
                        const updated = { ...editFormData, vehicleType: val };
                        const bodyNo = editFormData.bodyNo || '';
                        const firstChar = bodyNo.charAt(0);
                        if (val === 'Tricycle') {
                          if (bodyNo.startsWith('BB')) {
                            updated.zone = 'BB';
                          } else if (firstChar >= '1' && firstChar <= '9') {
                            updated.zone = `Zone ${firstChar}`;
                          }
                        }
                        
                        const colorOpts = getColorOptions(bodyNo, val);
                        if (colorOpts.length === 1) {
                          updated.colorCode = colorOpts[0];
                        } else if (colorOpts.length > 1) {
                          if (!colorOpts.includes(updated.colorCode)) {
                            updated.colorCode = '';
                          }
                        }
                        
                        setEditFormData(updated);
                      }}
                    >
                      <option value="Tricycle">Tricycle</option>
                      <option value="Jeepney">Jeepney</option>
                      <option value="Mini Bus">Mini Bus</option>
                    </select>
                  </div>
                  {editFormData.vehicleType === 'Tricycle' && (
                    <div className="form-group">
                      <label>Zone</label>
                      <input type="text" className="input-field" value={editFormData.zone} onChange={e => setEditFormData({...editFormData, zone: e.target.value})} />
                    </div>
                  )}
                  {(editFormData.vehicleType === 'Jeepney' || editFormData.vehicleType === 'Mini Bus') && (
                    <div className="form-group" style={{ borderColor: 'var(--accent-color)' }}>
                      <label style={{ color: 'var(--accent-color)' }}>LTFRB Case No.</label>
                      <input type="text" className="input-field" style={{ borderColor: 'var(--accent-color)' }} value={editFormData.ltfrbMchCaseNo} onChange={e => setEditFormData({...editFormData, ltfrbMchCaseNo: e.target.value})} />
                    </div>
                  )}
                  {editFormData.vehicleType === 'Mini Bus' && (
                    <div className="form-group">
                      <label>Conductor Profile</label>
                      <select className="input-field" value={editFormData.conductor} onChange={e => setEditFormData({...editFormData, conductor: e.target.value})}>
                        <option value="">-- No Conductor Assigned --</option>
                        {conductorsList.map(c => (
                          <option key={c._id} value={c._id}>
                            {c.firstName} {c.lastName} (ID: {c.cpdoId})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Plate Number</label>
                    <input type="text" className="input-field" value={editFormData.plateNo} onChange={e => setEditFormData({...editFormData, plateNo: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Make/Type</label>
                    <input type="text" className="input-field" value={editFormData.makeType} onChange={e => setEditFormData({...editFormData, makeType: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Year Model</label>
                    <input type="text" className="input-field" value={editFormData.yearModel} onChange={e => setEditFormData({...editFormData, yearModel: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Color Code</label>
                    {getColorOptions(editFormData.bodyNo, editFormData.vehicleType).length > 1 ? (
                      <select 
                        className="input-field" 
                        value={editFormData.colorCode} 
                        onChange={e => setEditFormData({...editFormData, colorCode: e.target.value})}
                      >
                        <option value="">-- Select Color --</option>
                        {getColorOptions(editFormData.bodyNo, editFormData.vehicleType).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="input-field" value={editFormData.colorCode} onChange={e => setEditFormData({...editFormData, colorCode: e.target.value})} />
                    )}
                  </div>
                  <div className="form-group">
                    <label>Chassis Number</label>
                    <input type="text" className="input-field" value={editFormData.chassisNo} onChange={e => setEditFormData({...editFormData, chassisNo: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Motor Number</label>
                    <input type="text" className="input-field" value={editFormData.motorNo} onChange={e => setEditFormData({...editFormData, motorNo: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Confirm Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitMonitoring;
