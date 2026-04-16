import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import './OperatorsPage.css';

const OperatorsPage = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');

  const initialUnit = {
    bodyNo: '', colorCode: '', makeType: '',
    chassisNo: '', motorNo: '', plateNo: '', yearModel: ''
  };
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitData, setNewUnitData] = useState(initialUnit);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/operators');
        setOperators(res.data);
        if (res.data[0]?._id) {
          setSelectedOperatorId(res.data[0]._id);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load operators.');
      } finally {
        setLoading(false);
      }
    };

    fetchOperators();
  }, []);

  const refreshOperators = async (keepSelected = true) => {
    const res = await axios.get('http://localhost:5000/api/operators');
    setOperators(res.data);
    if (!keepSelected) {
      setSelectedOperatorId(res.data[0]?._id || '');
      return;
    }
    if (!res.data.some((operator) => operator._id === selectedOperatorId)) {
      setSelectedOperatorId(res.data[0]?._id || '');
    }
  };

  const filteredOperators = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return operators;
    return operators.filter((operator) => {
      const fullName = `${operator.firstName} ${operator.lastName}`.toLowerCase();
      const unitMatches = (operator.units || []).some((unit) => (
        String(unit.bodyNo || '').toLowerCase().includes(query)
        || String(unit.plateNo || '').toLowerCase().includes(query)
      ));
      return (
        fullName.includes(query)
        || unitMatches
      );
    });
  }, [operators, search]);

  const selectedOperator = useMemo(
    () => filteredOperators.find((operator) => operator._id === selectedOperatorId) || null,
    [filteredOperators, selectedOperatorId],
  );

  const handleAddUnitClick = () => {
    setNewUnitData(initialUnit);
    setActionError('');
    setShowUnitModal(true);
  };

  const submitNewUnit = async (e) => {
    e.preventDefault();
    if (!selectedOperatorId || !newUnitData.bodyNo) return;
    setAddingUnit(true);
    setActionError('');
    try {
      await axios.post(`http://localhost:5000/api/operators/${selectedOperatorId}/units`, newUnitData);
      await refreshOperators(true);
      setShowUnitModal(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to add unit.');
    } finally {
      setAddingUnit(false);
    }
  };

  return (
    <div className="operators-page animate-fade-in">
      <div className="operators-header">
        <div>
          <h1>Operators</h1>
          <p>Manage operators, their units, and all assigned drivers.</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => navigate('/operators/new')}>
          <Plus size={18} />
          Add Operator
        </button>
      </div>

      <div className="glass-panel operators-search">
        <input
          type="text"
          className="input-field"
          placeholder="Search by operator name, body no, or plate no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="glass-panel operators-state">Loading operators...</div>
      ) : error ? (
        <div className="glass-panel operators-state">{error}</div>
      ) : (
        <div className="operators-layout">
          <div className="glass-panel operators-list">
            <h2>Operator Directory</h2>
            {filteredOperators.length === 0 ? (
              <p className="operators-state">No operators found.</p>
            ) : (
              <div className="operator-cards">
                {filteredOperators.map((operator) => (
                  <button
                    key={operator._id}
                    type="button"
                    className={`operator-card ${selectedOperatorId === operator._id ? 'active' : ''}`}
                    onClick={() => setSelectedOperatorId(operator._id)}
                  >
                    <div className="operator-card-title">
                      {operator.firstName} {operator.lastName}
                    </div>
                    <p>{operator.unitCount || 0} unit(s) | {operator.driverCount} driver(s)</p>
                    <span>Contact: {operator.contactNo || '-'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel operator-details">
            <h2>Operator Details</h2>
            {actionError && <p className="operators-state">{actionError}</p>}
            {!selectedOperator ? (
              <p className="operators-state">Select an operator to view details and assigned drivers.</p>
            ) : (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <button className="btn-secondary" type="button" onClick={handleAddUnitClick} disabled={addingUnit}>
                    <Plus size={16} /> Add Unit
                  </button>
                </div>
                <div className="operator-meta">
                  <div><span>Name:</span><strong>{selectedOperator.firstName} {selectedOperator.lastName}</strong></div>
                  <div><span>Total Units:</span><strong>{selectedOperator.unitCount || 0}</strong></div>
                  <div><span>Contact:</span><strong>{selectedOperator.contactNo || '-'}</strong></div>
                  <div><span>Area:</span><strong>{selectedOperator.barangay || '-'}, {selectedOperator.cityMunicipality || '-'}</strong></div>
                </div>

                <h3>Units ({selectedOperator.unitCount || 0})</h3>
                {selectedOperator.units?.length ? (
                  <div className="operator-drivers">
                    {selectedOperator.units.map((unit) => (
                      <div key={unit._id} className="operator-driver-item">
                        <strong>Body #{unit.bodyNo}</strong>
                        <p>Plate: {unit.plateNo || '-'}</p>
                        <p>Make/Type: {unit.makeType || '-'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="operators-state">No units added yet.</p>
                )}

                <h3>Assigned Drivers ({selectedOperator.driverCount})</h3>
                {selectedOperator.drivers.length === 0 ? (
                  <p className="operators-state">No drivers assigned yet.</p>
                ) : (
                  <div className="operator-drivers">
                    {selectedOperator.drivers.map((driver) => (
                      <div key={driver._id} className="operator-driver-item">
                        <strong>{driver.firstName} {driver.lastName}</strong>
                        <p>CPDO ID: {driver.cpdoId} | License: {driver.licenseNo}</p>
                        <p>Assigned Unit: {driver.unit?.bodyNo || '-'}</p>
                        <p>Status: {driver.status || 'Active'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {showUnitModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3>Add Unit to Operator</h3>
              <button className="modal-close" onClick={() => setShowUnitModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitNewUnit}>
              <div className="modal-body driver-form">
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group">
                    <label>Body No.</label>
                    <input required type="text" className="input-field" value={newUnitData.bodyNo} onChange={(e) => setNewUnitData({ ...newUnitData, bodyNo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Plate No.</label>
                    <input type="text" className="input-field" value={newUnitData.plateNo} onChange={(e) => setNewUnitData({ ...newUnitData, plateNo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Color Code</label>
                    <input type="text" className="input-field" value={newUnitData.colorCode} onChange={(e) => setNewUnitData({ ...newUnitData, colorCode: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Make/Type</label>
                    <input type="text" className="input-field" value={newUnitData.makeType} onChange={(e) => setNewUnitData({ ...newUnitData, makeType: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Chassis No.</label>
                    <input type="text" className="input-field" value={newUnitData.chassisNo} onChange={(e) => setNewUnitData({ ...newUnitData, chassisNo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Motor No.</label>
                    <input type="text" className="input-field" value={newUnitData.motorNo} onChange={(e) => setNewUnitData({ ...newUnitData, motorNo: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Year Model</label>
                    <input type="text" className="input-field" value={newUnitData.yearModel} onChange={(e) => setNewUnitData({ ...newUnitData, yearModel: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowUnitModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={addingUnit}>
                  {addingUnit ? 'Saving...' : 'Save Unit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorsPage;
