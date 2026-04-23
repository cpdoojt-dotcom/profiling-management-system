import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpDown, Plus, Bus } from 'lucide-react';
import axios from 'axios';
import { useConfirm } from '../context/ConfirmContext';
import './DriversList.css'; // Reusing drivers list styles

const sortConductors = (items, sortBy, direction) => {
  const sorted = [...items].sort((a, b) => {
    const left = String(a[sortBy] ?? '').toLowerCase();
    const right = String(b[sortBy] ?? '').toLowerCase();
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });

  return direction === 'asc' ? sorted : sorted.reverse();
};

const ConductorList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState('lastName');
  const [direction, setDirection] = useState('desc');
  const [selectedConductorId, setSelectedConductorId] = useState('');
  const [query, setQuery] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [operators, setOperators] = useState([]);
  const [editForm, setEditForm] = useState({
    conductor: {
      firstName: '', lastName: '', middleName: '', status: 'Active',
      operator: '', unit: '',
      birthPlace: '', gender: 'Male', civilStatus: '',
      emergencyContactName: '', emergencyContactNo: '', emergencyContactAddress: ''
    },
  });
  const pageSize = 8;
  const searchParams = new URLSearchParams(location.search);
  const selectedFromQuery = searchParams.get('conductorId');

  const fetchConductors = async () => {
    const res = await axios.get('http://localhost:5000/api/conductors');
    setConductors(res.data);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchConductors();
        const opRes = await axios.get('http://localhost:5000/api/operators');
        setOperators(opRes.data.filter(op => op.operatorType === 'Mini Bus' || (op.units?.some(u => u.vehicleType === 'Mini Bus'))));
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedFromQuery) {
      setSelectedConductorId(selectedFromQuery);
    }
  }, [selectedFromQuery]);

  const barangayOptions = useMemo(
    () => [...new Set(conductors.map((c) => c.operator?.barangay).filter(Boolean))],
    [conductors],
  );

  const filteredConductors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return conductors.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesQuery = !normalizedQuery
        || fullName.includes(normalizedQuery)
        || String(c.unit?.plateNo || '').toLowerCase().includes(normalizedQuery)
        || String(c.unit?.bodyNo || '').toLowerCase().includes(normalizedQuery);
      const matchesBarangay = barangayFilter === 'all' || c.operator?.barangay === barangayFilter;
      return matchesQuery && matchesBarangay;
    });
  }, [conductors, query, barangayFilter]);

  const sortedConductors = useMemo(() => {
    if (sortBy === 'createdAt') {
      const ordered = [...filteredConductors].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      );
      return direction === 'asc' ? ordered : ordered.reverse();
    }
    return sortConductors(filteredConductors, sortBy, direction);
  }, [filteredConductors, sortBy, direction]);

  const totalPages = Math.max(1, Math.ceil(sortedConductors.length / pageSize));
  const pagedConductors = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedConductors.slice(start, start + pageSize);
  }, [sortedConductors, page]);

  useEffect(() => {
    setPage(1);
  }, [query, barangayFilter]);

  const selectedConductor = useMemo(
    () => sortedConductors.find((c) => c._id === selectedConductorId) || null,
    [sortedConductors, selectedConductorId],
  );

  useEffect(() => {
    if (!selectedConductor) return;
    setEditForm({
      conductor: {
        firstName: selectedConductor.firstName || '',
        lastName: selectedConductor.lastName || '',
        middleName: selectedConductor.middleName || '',
        status: selectedConductor.status || 'Active',
        operator: selectedConductor.operator?._id || selectedConductor.operator || '',
        unit: selectedConductor.unit?._id || selectedConductor.unit || '',
        birthPlace: selectedConductor.birthPlace || '',
        gender: selectedConductor.gender || 'Male',
        civilStatus: selectedConductor.civilStatus || '',
        emergencyContactName: selectedConductor.emergencyContactName || '',
        emergencyContactNo: selectedConductor.emergencyContactNo || '',
        emergencyContactAddress: selectedConductor.emergencyContactAddress || '',
      },
    });
    setEditImageFile(null);
    setActionError('');
  }, [selectedConductorId, selectedConductor]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(field);
    setDirection('asc');
  };

  const handleEditChange = (section) => (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: value,
      },
    }));
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedConductorId) return;
    if (!await confirm('Are you sure you want to save changes to this conductor profile?')) return;
    setActionLoading(true);
    setActionError('');
    try {
      const payload = new FormData();
      payload.append('conductor', JSON.stringify(editForm.conductor));
      if (editImageFile) {
        payload.append('conductorImage', editImageFile);
      }

      const res = await axios.put(`http://localhost:5000/api/conductors/${selectedConductorId}`, payload);
      setConductors((prev) => prev.map((item) => (item._id === selectedConductorId ? res.data : item)));
      setEditImageFile(null);
      setIsEditing(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to update conductor.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedConductorId) return;
    if (!await confirm('Delete this conductor profile? This action cannot be undone.')) return;
    setActionLoading(true);
    setActionError('');
    try {
      await axios.delete(`http://localhost:5000/api/conductors/${selectedConductorId}`);
      const remaining = conductors.filter((item) => item._id !== selectedConductorId);
      setConductors(remaining);
      setSelectedConductorId(remaining[0]?._id || '');
      setIsEditing(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to delete conductor.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="drivers-page animate-fade-in">
      <div className="drivers-header">
        <div>
          <h1>Conductors Directory</h1>
          <p>View, sort, and inspect all saved Mini Bus conductor profiles.</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => navigate('/conductors/new')}>
          <Plus size={18} />
          Add Conductor
        </button>
      </div>

      <div className="glass-panel driver-filters">
        <input
          type="text"
          className="input-field"
          placeholder="Search by name, body no, or plate..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input-field" value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)}>
          <option value="all">All Barangay</option>
          {barangayOptions.map((barangay) => (
            <option key={barangay} value={barangay}>{barangay}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="glass-panel drivers-state">Loading conductors...</div>
      ) : error ? (
        <div className="glass-panel drivers-state">{error}</div>
      ) : (
        <div className="drivers-layout">
          <div className="glass-panel drivers-table-wrap">
            <table className="drivers-table">
              <thead>
                <tr>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('unit.bodyNo')}>
                      Body # <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('lastName')}>
                      Conductor Name <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('status')}>
                      Status <ArrowUpDown size={14} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedConductors.map((c) => (
                  <tr
                    key={c._id}
                    onClick={() => setSelectedConductorId(c._id)}
                    className={selectedConductorId === c._id ? 'selected-row' : ''}
                  >
                    <td style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{c.unit?.bodyNo || '-'}</td>
                    <td>{c.firstName} {c.lastName}</td>
                    <td>
                      <span className={`status-type mini-bus`}>
                        <Bus size={14} /> {' '}{c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedConductors.length === 0 && (
              <p className="details-empty no-results">No conductors matched your filters.</p>
            )}
            <div className="pagination">
              <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>

          <div className="glass-panel driver-details">
            <div className="details-header">
              <h2>Conductor Details</h2>
              {selectedConductor && !isEditing && (
                <div className="details-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)}>Edit</button>
                  <button type="button" className="btn-danger" onClick={handleDelete} disabled={actionLoading}>
                    {actionLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
            {actionError && <p className="action-error">{actionError}</p>}
            {!selectedConductor ? (
              <p className="details-empty">Select a conductor to view full details.</p>
            ) : isEditing ? (
              <form className="edit-form" onSubmit={handleUpdate}>
                <div className="edit-photo-group">
                  <label>Replace Conductor Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="input-field"
                    onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                  />
                  {(editImageFile || selectedConductor.photoUrl) && (
                    <img
                      src={editImageFile ? URL.createObjectURL(editImageFile) : selectedConductor.photoUrl}
                      alt="Conductor preview"
                      className="details-photo"
                    />
                  )}
                </div>
                <div className="edit-grid">
                  <div className="edit-form-group">
                    <label>First Name</label>
                    <input name="firstName" className="input-field" value={editForm.conductor.firstName} onChange={handleEditChange('conductor')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Middle Name</label>
                    <input name="middleName" className="input-field" value={editForm.conductor.middleName} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Last Name</label>
                    <input name="lastName" className="input-field" value={editForm.conductor.lastName} onChange={handleEditChange('conductor')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Gender</label>
                    <select name="gender" className="input-field" value={editForm.conductor.gender} onChange={handleEditChange('conductor')}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Civil Status</label>
                    <input name="civilStatus" className="input-field" value={editForm.conductor.civilStatus} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Operator</label>
                    <select name="operator" className="input-field" value={editForm.conductor.operator} onChange={(e) => {
                      const opId = e.target.value;
                      const op = operators.find(o => o._id === opId);
                      const miniBusUnits = (op?.units || []).filter(u => u.vehicleType === 'Mini Bus');
                      const fallbackUnit = miniBusUnits[0]?._id || '';
                      setEditForm(prev => ({ ...prev, conductor: { ...prev.conductor, operator: opId, unit: fallbackUnit }}));
                    }}>
                      <option value="">Select Operator...</option>
                      {operators.map(op => <option key={op._id} value={op._id}>{op.firstName} {op.lastName}</option>)}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Mini Bus Unit</label>
                    <select name="unit" className="input-field" value={editForm.conductor.unit} onChange={handleEditChange('conductor')} disabled={!editForm.conductor.operator}>
                      <option value="">Select Unit...</option>
                      {(operators.find(o => o._id === editForm.conductor.operator)?.units || []).filter(u => u.vehicleType === 'Mini Bus').map(u => (
                        <option key={u._id} value={u._id}>Body #{u.bodyNo} | Plate {u.plateNo || '-'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Birth Place</label>
                    <input name="birthPlace" className="input-field" value={editForm.conductor.birthPlace} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Status</label>
                    <select name="status" className="input-field" value={editForm.conductor.status} onChange={handleEditChange('conductor')}>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Emergency Contact</h3>
                <div className="edit-grid">
                  <div className="edit-form-group">
                    <label>Person to Notify</label>
                    <input name="emergencyContactName" className="input-field" value={editForm.conductor.emergencyContactName} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Contact No.</label>
                    <input name="emergencyContactNo" className="input-field" value={editForm.conductor.emergencyContactNo} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group" style={{ gridColumn: 'span 2' }}>
                    <label>Emergency Contact Address</label>
                    <input name="emergencyContactAddress" className="input-field" value={editForm.conductor.emergencyContactAddress} onChange={handleEditChange('conductor')} />
                  </div>
                </div>

                <div className="edit-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setIsEditing(false); setEditImageFile(null); }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={actionLoading}>
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="details-grid">
                {selectedConductor.photoUrl ? (
                  <div className="details-photo-wrap">
                    <img src={selectedConductor.photoUrl} alt={`${selectedConductor.firstName} ${selectedConductor.lastName}`} className="details-photo" />
                  </div>
                ) : null}
                <div><span>Name:</span><strong>{selectedConductor.firstName} {selectedConductor.lastName}</strong></div>
                <div><span>Gender:</span><strong>{selectedConductor.gender || '-'}</strong></div>
                <div><span>Body No:</span><strong>{selectedConductor.unit?.bodyNo || '-'}</strong></div>
                <div><span>Plate No:</span><strong>{selectedConductor.unit?.plateNo || '-'}</strong></div>
                <div><span>Birth Place:</span><strong>{selectedConductor.birthPlace || '-'}</strong></div>
                <div><span>Civil Status:</span><strong>{selectedConductor.civilStatus || '-'}</strong></div>
                <div><span>Operator:</span><strong>{selectedConductor.operator?.firstName} {selectedConductor.operator?.lastName}</strong></div>
                <div><span>Status:</span><strong>{selectedConductor.status || 'Active'}</strong></div>
                <div className="details-full" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                  <span>Notify in Emergency:</span><strong>{selectedConductor.emergencyContactName || '-'} ({selectedConductor.emergencyContactNo || '-'})</strong>
                </div>
                <div className="details-full"><span>Emergency Address:</span><strong>{selectedConductor.emergencyContactAddress || '-'}</strong></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConductorList;
