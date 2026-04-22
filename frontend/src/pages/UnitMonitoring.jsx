import { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, History, ArrowRight, User, MapPin, Truck, Edit, X, Save, Bike, Bus } from 'lucide-react';
import './UnitMonitoring.css';

const UnitMonitoring = () => {
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
    if (!query.trim()) return;
    setLoading(true);
    setError('');
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
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
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
      setShowEditModal(false);
      fetchInitialData();
    } catch (err) {
      alert('Failed to update unit properly.');
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

  const getVehicleIcon = (type) => {
    switch (type) {
      case 'Tricycle': return <Bike size={16} />;
      case 'Jeepney': return <Truck size={16} />;
      case 'Mini Bus': return <Bus size={16} />;
      default: return <Truck size={16} />;
    }
  };

  return (
    <div className="monitoring-page animate-fade-in">
      <div className="monitoring-header">
        <h1>Unit Monitoring & Lifecycle</h1>
        <p>Track the history and changes of any vehicle by its Body Number.</p>
      </div>

      <form className="monitoring-search-wrap" onSubmit={searchUnits}>
        <input 
          type="text" 
          placeholder="Enter Body Number or Plate Number..." 
          className="input-field"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-primary" type="submit" disabled={loading}>
          <Search size={18} />
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <p className="action-error">{error}</p>}

      {!selectedUnit && units.length > 0 && (
        <div className="search-results">
          {units.map(unit => (
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
                        if (op && op.operatorType) {
                          updated.vehicleType = op.operatorType;
                          // Trigger zone logic if it became Tricycle
                          if (op.operatorType === 'Tricycle') {
                            const bodyNo = editFormData.bodyNo || '';
                            const firstChar = bodyNo.charAt(0);
                            if (bodyNo.startsWith('BB')) {
                              updated.zone = 'BB';
                            } else if (firstChar >= '1' && firstChar <= '9') {
                              updated.zone = `Zone ${firstChar}`;
                            }
                          }
                        }
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
                      style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                      value={editFormData.vehicleType} 
                      disabled
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
                    <input type="text" className="input-field" value={editFormData.colorCode} onChange={e => setEditFormData({...editFormData, colorCode: e.target.value})} />
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
