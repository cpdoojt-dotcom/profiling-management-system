import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, X, Bike, Truck, Bus, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import './OperatorsPage.css';

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

const getFullName = (person) => {
  if (!person) return '';
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

const sanitize = (value) => String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();

const OperatorsPage = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    lastName: '', firstName: '', middleName: '', civilStatus: '', age: '',
    addressNo: '', street: '', purok: '', barangay: '', cityMunicipality: '',
    contactNo: ''
  });

  const initialUnit = {
    bodyNo: '', colorCode: '', makeType: '',
    chassisNo: '', motorNo: '', plateNo: '', yearModel: '',
    vehicleType: 'Tricycle', zone: '', ltfrbMchCaseNo: ''
  };
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState(null);
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
      const fullName = getFullName(operator).toLowerCase();
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
    setEditingUnitId(null);
    setNewUnitData({
      ...initialUnit,
      vehicleType: 'Tricycle'
    });
    setActionError('');
    setShowUnitModal(true);
  };

  const handleEditUnitClick = (unit) => {
    setEditingUnitId(unit._id);
    setNewUnitData({
      bodyNo: unit.bodyNo || '',
      plateNo: unit.plateNo || '',
      colorCode: unit.colorCode || '',
      makeType: unit.makeType || '',
      chassisNo: unit.chassisNo || '',
      motorNo: unit.motorNo || '',
      yearModel: unit.yearModel || '',
      vehicleType: unit.vehicleType || 'Tricycle',
      zone: unit.zone || '',
      ltfrbMchCaseNo: unit.ltfrbMchCaseNo || '',
      conductorName: unit.conductorName || '',
    });
    setActionError('');
    setShowUnitModal(true);
  };

  const submitNewUnit = async (e) => {
    e.preventDefault();
    if (!selectedOperatorId || !newUnitData.bodyNo) return;
    const actionText = editingUnitId ? 'update this unit' : 'add this new unit';
    if (!await confirm(`Are you sure you want to ${actionText}?`)) return;
    setAddingUnit(true);
    setActionError('');
    try {
      if (editingUnitId) {
        await axios.put(`http://localhost:5000/api/units/${editingUnitId}`, newUnitData);
      } else {
        await axios.post(`http://localhost:5000/api/operators/${selectedOperatorId}/units`, newUnitData);
      }
      await refreshOperators(true);
      toast.success(editingUnitId ? 'Unit updated successfully!' : 'Unit added successfully!');
      setShowUnitModal(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to save unit.';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setAddingUnit(false);
    }
  };

  const handleEditOperator = () => {
    if (!selectedOperator) return;
    setEditForm({
      lastName: selectedOperator.lastName || '',
      firstName: selectedOperator.firstName || '',
      middleName: selectedOperator.middleName || '',
      civilStatus: selectedOperator.civilStatus || 'Single',
      birthdate: selectedOperator.birthdate || '',
      birthplace: selectedOperator.birthplace || '',
      age: selectedOperator.age || '',
      addressNo: selectedOperator.addressNo || '',
      street: selectedOperator.street || '',
      purok: selectedOperator.purok || '',
      barangay: selectedOperator.barangay || '',
      cityMunicipality: selectedOperator.cityMunicipality || '',
      contactNo: selectedOperator.contactNo || '',
      contactNo: selectedOperator.contactNo || '',
      operatorType: 'FOR HIRE',
    });
    setIsEditing(true);
    setActionError('');
  };

  const handleUpdateOperator = async (e) => {
    e.preventDefault();
    if (!selectedOperatorId) return;
    if (!await confirm('Are you sure you want to save changes to this operator profile?')) return;
    setAddingUnit(true); // Using same loading state
    setActionError('');
    try {
      const res = await axios.put(`http://localhost:5000/api/operators/${selectedOperatorId}`, editForm);
      setOperators(prev => prev.map(op => op._id === selectedOperatorId ? { ...op, ...res.data } : op));
      toast.success('Operator profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to update operator.';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setAddingUnit(false);
    }
  };

  const handleDeleteOperator = async () => {
    if (!selectedOperatorId) return;
    if (!await confirm('Delete this operator profile? All associated units and drivers will be affected.')) return;
    setAddingUnit(true);
    setActionError('');
    try {
      await axios.delete(`http://localhost:5000/api/operators/${selectedOperatorId}`);
      const remaining = operators.filter(op => op._id !== selectedOperatorId);
      setOperators(remaining);
      setSelectedOperatorId(remaining[0]?._id || '');
      toast.success('Operator profile deleted.');
      setIsEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete operator.';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setAddingUnit(false);
    }
  };

  const handleExportExcel = async () => {
    if (operators.length === 0) {
      toast.error('No operators available to export.');
      return;
    }

    const headers = [
      'NO.',
      'FIRST NAME',
      'MIDDLE NAME',
      'LAST NAME',
      'FULL NAME',
      'CLASSIFICATION',
      'CONTACT NO',
      'CIVIL STATUS',
      'AGE',
      'BIRTHDATE',
      'BIRTHPLACE',
      'ADDRESS NO',
      'STREET',
      'PUROK',
      'BARANGAY',
      'CITY/MUNICIPALITY',
      'TOTAL UNITS',
      'TOTAL DRIVERS',
      'TOTAL CONDUCTORS',
      'CREATED AT',
      'UPDATED AT',
    ];

    const rows = operators.map((operator, index) => ([
      index + 1,
      sanitize(operator.firstName),
      sanitize(operator.middleName),
      sanitize(operator.lastName),
      sanitize(getFullName(operator)),
      sanitize(operator.operatorType || 'FOR HIRE'),
      sanitize(operator.contactNo),
      sanitize(operator.civilStatus),
      sanitize(operator.age),
      sanitize(operator.birthdate ? new Date(operator.birthdate).toLocaleDateString('en-PH') : ''),
      sanitize(operator.birthplace),
      sanitize(operator.addressNo),
      sanitize(operator.street),
      sanitize(operator.purok),
      sanitize(operator.barangay),
      sanitize(operator.cityMunicipality),
      sanitize(operator.unitCount || 0),
      sanitize(operator.driverCount || 0),
      sanitize(operator.conductorCount || 0),
      sanitize(operator.createdAt ? new Date(operator.createdAt).toLocaleString('en-PH') : ''),
      sanitize(operator.updatedAt ? new Date(operator.updatedAt).toLocaleString('en-PH') : ''),
    ]));

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Operators');

      worksheet.addRow(headers);
      rows.forEach((row) => worksheet.addRow(row));

      worksheet.getRow(1).height = 22;
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      });

      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
        worksheet.getRow(rowNumber).eachCell((cell) => {
          cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: false };
        });
      }

      worksheet.columns.forEach((column) => {
        let maxLength = 12;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const value = cell.value ? String(cell.value) : '';
          maxLength = Math.max(maxLength, value.length + 2);
        });
        column.width = Math.min(50, maxLength);
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `operators-directory-${timestamp}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Operators exported to Excel successfully.');
    } catch (err) {
      toast.error('Failed to export operators to Excel.');
    }
  };

  return (
    <div className="operators-page animate-fade-in">
      <div className="operators-header">
        <div>
          <h1>Operators</h1>
          <p>Manage operators, their units, and all assigned drivers.</p>
        </div>
        <div className="operators-header-actions">
          <button className="btn-secondary export-btn" type="button" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button className="btn-primary" type="button" onClick={() => navigate('/operators/new')}>
            <Plus size={18} />
            Add Operator
          </button>
        </div>
      </div>

      <div className="glass-panel operators-search">
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: '2.5rem' }}
            placeholder="Search by operator name, body no, or plate no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              type="button" 
              className="input-clear-btn"
              onClick={() => setSearch('')}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
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
                      {getFullName(operator)}
                    </div>
                    <p>{operator.unitCount || 0} unit(s) | {operator.driverCount} driver(s) | {operator.conductorCount || 0} conductor(s)</p>
                    <span>Contact: {operator.contactNo || '-'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel operator-details">
            <div className="details-header">
              <h2>Operator Details</h2>
              {selectedOperator && !isEditing && (
                <div className="details-actions">
                  <button className="btn-secondary" type="button" onClick={handleEditOperator}>Edit</button>
                  <button className="btn-danger" type="button" onClick={handleDeleteOperator}>Delete</button>
                </div>
              )}
            </div>

            {actionError && <p className="operators-state" style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{actionError}</p>}
            
            {!selectedOperator ? (
              <p className="operators-state">Select an operator to view details and assigned drivers.</p>
            ) : isEditing ? (
              <form onSubmit={handleUpdateOperator} className="edit-form">
                <div className="form-grid-2col">
                  <div className="edit-form-group">
                    <label>First Name</label>
                    <input className="input-field" value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value.toUpperCase() })} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Middle Name</label>
                    <input className="input-field" value={editForm.middleName} onChange={e => setEditForm({ ...editForm, middleName: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Last Name</label>
                    <input className="input-field" value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value.toUpperCase() })} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Age</label>
                    <input type="number" className="input-field" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} />
                  </div>
                   <div className="edit-form-group">
                    <label>Civil Status</label>
                    <select className="input-field" value={editForm.civilStatus} onChange={e => setEditForm({ ...editForm, civilStatus: e.target.value })}>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Birthdate</label>
                    <input type="date" className="input-field" value={editForm.birthdate ? editForm.birthdate.split('T')[0] : ''} onChange={e => setEditForm({ ...editForm, birthdate: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Birthplace</label>
                    <input type="text" className="input-field" value={editForm.birthplace} onChange={e => setEditForm({ ...editForm, birthplace: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Contact No.</label>
                    <input className="input-field" value={editForm.contactNo} onChange={e => setEditForm({ ...editForm, contactNo: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Address No.</label>
                    <input className="input-field" value={editForm.addressNo} onChange={e => setEditForm({ ...editForm, addressNo: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Street</label>
                    <input className="input-field" value={editForm.street} onChange={e => setEditForm({ ...editForm, street: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Purok</label>
                    <input className="input-field" value={editForm.purok} onChange={e => setEditForm({ ...editForm, purok: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Barangay</label>
                    <input className="input-field" value={editForm.barangay} onChange={e => setEditForm({ ...editForm, barangay: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>City/Municipality</label>
                    <input className="input-field" value={editForm.cityMunicipality} onChange={e => setEditForm({ ...editForm, cityMunicipality: e.target.value })} />
                  </div>
                  <div className="edit-form-group">
                    <label>Classification</label>
                    <input 
                      readOnly 
                      className="input-field" 
                      style={{ background: 'var(--surface-bg)', opacity: 0.7 }} 
                      value={editForm.operatorType} 
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={addingUnit}>
                    {addingUnit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="operator-details-controls">
                  <button className="btn-secondary" type="button" onClick={handleAddUnitClick} disabled={addingUnit}>
                    <Plus size={16} /> Add Unit
                  </button>
                </div>
                <div className="operator-meta">
                  <div><span>Name:</span><strong>{getFullName(selectedOperator)}</strong></div>
                  <div><span>Classification:</span><strong>{selectedOperator.operatorType || '-'}</strong></div>
                  <div><span>Total Units:</span><strong>{selectedOperator.unitCount || 0}</strong></div>
                  <div><span>Age:</span><strong>{selectedOperator.age || '-'}</strong></div>
                  <div><span>Civil Status:</span><strong>{selectedOperator.civilStatus || '-'}</strong></div>
                  <div><span>Birthdate:</span><strong>{selectedOperator.birthdate ? new Date(selectedOperator.birthdate).toLocaleDateString() : '-'}</strong></div>
                  <div><span>Birthplace:</span><strong>{selectedOperator.birthplace || '-'}</strong></div>
                  <div><span>Contact:</span><strong>{selectedOperator.contactNo || '-'}</strong></div>
                  <div><span>Area:</span><strong>{selectedOperator.barangay || '-'}, {selectedOperator.cityMunicipality || '-'}</strong></div>
                </div>

                <h3>Units ({selectedOperator.unitCount || 0})</h3>
                {selectedOperator.units?.length ? (
                  <div className="operator-drivers">
                    {selectedOperator.units.map((unit) => (
                      <div key={unit._id} className="operator-driver-item" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>Body #{unit.bodyNo}</strong>
                          <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEditUnitClick(unit)}>Edit</button>
                        </div>
                        <p>Plate: {unit.plateNo || '-'}</p>
                        <p>
                          {unit.vehicleType === 'Tricycle' ? <Bike size={14} /> : 
                           unit.vehicleType === 'Jeepney' ? <Truck size={14} /> : 
                           <Bus size={14} />} 
                          {' '}{unit.vehicleType} | {unit.vehicleType === 'Tricycle' ? (unit.zone || 'No Zone') : (unit.ltfrbMchCaseNo || 'No LTFRB No.')}
                        </p>
                        <p>
                          Conductor: {
                            unit.conductor ? 
                            (typeof unit.conductor === 'object' ? `${unit.conductor.firstName} ${unit.conductor.lastName}` : unit.conductor) : 
                            (unit.conductorName || 'None')
                          }
                        </p>
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

                <h3>Assigned Conductors ({selectedOperator.conductorCount || 0})</h3>
                {selectedOperator.conductors?.length === 0 ? (
                  <p className="operators-state">No conductors assigned yet.</p>
                ) : (
                  <div className="operator-drivers">
                    {selectedOperator.conductors?.map((conductor) => (
                      <div key={conductor._id} className="operator-driver-item" style={{ borderLeftColor: 'var(--accent-color)' }}>
                        <strong>{conductor.firstName} {conductor.lastName}</strong>
                        <p>Status: {conductor.status || 'Active'}</p>
                        <p>Assigned Unit: {conductor.unit?.bodyNo || '-'}</p>
                        <p>Contact: {conductor.emergencyContactNo || '-'}</p>
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
              <h3>{editingUnitId ? 'Edit Unit' : 'Add Unit to Operator'}</h3>
              <button className="modal-close" onClick={() => setShowUnitModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={submitNewUnit}>
              <div className="modal-body driver-form">
                <div className="form-grid" style={{ marginBottom: 0 }}>
                  <div className="form-group">
                    <label>Body No.</label>
                    <input 
                      required 
                      type="text" 
                      className="input-field" 
                      value={newUnitData.bodyNo} 
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        const updated = { ...newUnitData, bodyNo: val };
                        
                        const bn = val.toUpperCase();
                        if (/^[1-9]/.test(bn) || bn.startsWith('BB')) updated.vehicleType = 'Tricycle';
                        else if (bn.startsWith('JO') || /^J1[0-3]/.test(bn)) updated.vehicleType = 'Jeepney';
                        else if (bn.startsWith('O-B') || bn.startsWith('O-Z')) updated.vehicleType = 'Mini Bus';
                        
                        const vehicleType = updated.vehicleType || newUnitData.vehicleType;
                        const firstChar = val.charAt(0);
                        if (vehicleType === 'Tricycle') {
                          if (val.startsWith('BB')) {
                            updated.zone = 'BB';
                          } else if (firstChar >= '1' && firstChar <= '9') {
                            updated.zone = `Zone ${firstChar}`;
                          }
                        }
                        
                        const colorOpts = getColorOptions(val, vehicleType);
                        if (colorOpts.length === 1) {
                          updated.colorCode = colorOpts[0];
                        } else if (colorOpts.length > 1) {
                          if (!colorOpts.includes(updated.colorCode)) {
                            updated.colorCode = '';
                          }
                        }

                        setNewUnitData(updated);
                      }} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Plate No.</label>
                    <input type="text" className="input-field" value={newUnitData.plateNo} onChange={(e) => setNewUnitData({ ...newUnitData, plateNo: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="form-group">
                    <label>Color Code</label>
                    {getColorOptions(newUnitData.bodyNo, newUnitData.vehicleType).length > 1 ? (
                      <select 
                        className="input-field" 
                        value={newUnitData.colorCode} 
                        onChange={(e) => setNewUnitData({ ...newUnitData, colorCode: e.target.value })}
                      >
                        <option value="">-- Select Color --</option>
                        {getColorOptions(newUnitData.bodyNo, newUnitData.vehicleType).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input type="text" className="input-field" value={newUnitData.colorCode} onChange={(e) => setNewUnitData({ ...newUnitData, colorCode: e.target.value })} />
                    )}
                  </div>
                  <div className="form-group">
                    <label>Make/Type</label>
                    <input type="text" className="input-field" value={newUnitData.makeType} onChange={(e) => setNewUnitData({ ...newUnitData, makeType: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="form-group">
                    <label>Chassis No.</label>
                    <input type="text" className="input-field" value={newUnitData.chassisNo} onChange={(e) => setNewUnitData({ ...newUnitData, chassisNo: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="form-group">
                    <label>Motor No.</label>
                    <input type="text" className="input-field" value={newUnitData.motorNo} onChange={(e) => setNewUnitData({ ...newUnitData, motorNo: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="form-group">
                    <label>Year Model</label>
                    <input type="text" className="input-field" value={newUnitData.yearModel} onChange={(e) => setNewUnitData({ ...newUnitData, yearModel: e.target.value.toUpperCase() })} />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Category</label>
                    <select 
                      className="input-field" 
                      value={newUnitData.vehicleType} 
                      onChange={(e) => {
                        const val = e.target.value;
                        const updated = { ...newUnitData, vehicleType: val };
                        const bodyNo = newUnitData.bodyNo || '';
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

                        setNewUnitData(updated);
                      }}
                    >
                      <option value="Tricycle">Tricycle</option>
                      <option value="Jeepney">Jeepney</option>
                      <option value="Mini Bus">Mini Bus</option>
                    </select>
                  </div>
                  {newUnitData.vehicleType === 'Tricycle' && (
                    <div className="form-group">
                      <label>Zone</label>
                      <input type="text" className="input-field" value={newUnitData.zone} onChange={(e) => setNewUnitData({ ...newUnitData, zone: e.target.value })} />
                    </div>
                  )}
                  {(newUnitData.vehicleType === 'Jeepney' || newUnitData.vehicleType === 'Mini Bus') && (
                    <div className="form-group" style={{ borderColor: 'var(--accent-color)' }}>
                      <label style={{ color: 'var(--accent-color)' }}>LTFRB Case No.</label>
                      <input type="text" className="input-field" style={{ borderColor: 'var(--accent-color)' }} value={newUnitData.ltfrbMchCaseNo} onChange={(e) => setNewUnitData({ ...newUnitData, ltfrbMchCaseNo: e.target.value })} />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Conductor Name</label>
                    <input type="text" className="input-field" value={newUnitData.conductorName} onChange={(e) => setNewUnitData({ ...newUnitData, conductorName: e.target.value.toUpperCase() })} />
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
