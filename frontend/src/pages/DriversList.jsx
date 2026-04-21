import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpDown, Plus, Bike, Truck, Bus } from 'lucide-react';
import axios from 'axios';
import './DriversList.css';

const sortDrivers = (items, sortBy, direction) => {
  const sorted = [...items].sort((a, b) => {
    const left = String(a[sortBy] ?? '').toLowerCase();
    const right = String(b[sortBy] ?? '').toLowerCase();
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });

  return direction === 'asc' ? sorted : sorted.reverse();
};

const DriversList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState('lastName');
  const [direction, setDirection] = useState('desc');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [query, setQuery] = useState('');
  const [barangayFilter, setBarangayFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [operators, setOperators] = useState([]);
  const [editForm, setEditForm] = useState({
    driver: {
      cpdoId: '', firstName: '', lastName: '', middleName: '', licenseNo: '', licenseExpiryDate: '', licenseRestrictions: '', contactNo: '', status: 'Active',
      addressNo: '', street: '', purok: '', barangay: '', cityMunicipality: '', operator: '', unit: ''
    },
  });
  const pageSize = 8;
  const searchParams = new URLSearchParams(location.search);
  const selectedFromQuery = searchParams.get('driverId');
  const typeFromQuery = searchParams.get('type');

  const fetchDrivers = async () => {
    const res = await axios.get('http://localhost:5000/api/drivers');
    setDrivers(res.data);
  };

  useEffect(() => {
    const loadDriversAndOperators = async () => {
      try {
        await fetchDrivers();
        const opRes = await axios.get('http://localhost:5000/api/operators');
        setOperators(opRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load data.');
      } finally {
        setLoading(false);
      }
    };
    loadDriversAndOperators();
  }, []);

  useEffect(() => {
    if (selectedFromQuery) {
      setSelectedDriverId(selectedFromQuery);
    }
    if (typeFromQuery) {
      setCategoryFilter(typeFromQuery);
    }
  }, [selectedFromQuery, typeFromQuery]);

  const barangayOptions = useMemo(
    () => [...new Set(drivers.map((driver) => driver.operator?.barangay).filter(Boolean))],
    [drivers],
  );

  const filteredDrivers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return drivers.filter((driver) => {
      const fullName = `${driver.firstName} ${driver.lastName}`.toLowerCase();
      const matchesQuery = !normalizedQuery
        || fullName.includes(normalizedQuery)
        || String(driver.cpdoId || '').toLowerCase().includes(normalizedQuery)
        || String(driver.licenseNo || '').toLowerCase().includes(normalizedQuery)
        || String(driver.unit?.plateNo || '').toLowerCase().includes(normalizedQuery)
        || String(driver.unit?.bodyNo || '').toLowerCase().includes(normalizedQuery);
      const matchesBarangay = barangayFilter === 'all' || driver.operator?.barangay === barangayFilter;
      const matchesCategory = categoryFilter === 'all'
        || String(driver.driverType || 'Tricycle').toLowerCase() === categoryFilter.toLowerCase();
      return matchesQuery && matchesBarangay && matchesCategory;
    });
  }, [drivers, query, barangayFilter, categoryFilter]);

  const sortedDrivers = useMemo(() => {
    if (sortBy === 'createdAt') {
      const ordered = [...filteredDrivers].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      );
      return direction === 'asc' ? ordered : ordered.reverse();
    }
    return sortDrivers(filteredDrivers, sortBy, direction);
  }, [filteredDrivers, sortBy, direction]);

  const totalPages = Math.max(1, Math.ceil(sortedDrivers.length / pageSize));
  const pagedDrivers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedDrivers.slice(start, start + pageSize);
  }, [sortedDrivers, page]);

  useEffect(() => {
    setPage(1);
  }, [query, barangayFilter, categoryFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const selectedDriver = useMemo(
    () => sortedDrivers.find((driver) => driver._id === selectedDriverId) || null,
    [sortedDrivers, selectedDriverId],
  );

  useEffect(() => {
    if (!selectedDriver) return;
    setEditForm({
      driver: {
        cpdoId: selectedDriver.cpdoId || '',
        firstName: selectedDriver.firstName || '',
        lastName: selectedDriver.lastName || '',
        middleName: selectedDriver.middleName || '',
        licenseNo: selectedDriver.licenseNo || '',
        licenseExpiryDate: selectedDriver.licenseExpiryDate || '',
        licenseRestrictions: selectedDriver.licenseRestrictions || '',
        contactNo: selectedDriver.contactNo || '',
        status: selectedDriver.status || 'Active',
        addressNo: selectedDriver.addressNo || '',
        street: selectedDriver.street || '',
        purok: selectedDriver.purok || '',
        barangay: selectedDriver.barangay || '',
        cityMunicipality: selectedDriver.cityMunicipality || '',
        operator: selectedDriver.operator?._id || '',
        unit: selectedDriver.unit?._id || '',
      },
    });
    setEditImageFile(null);
    setActionError('');
  }, [selectedDriverId, selectedDriver]);

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
    if (!selectedDriverId) return;
    setActionLoading(true);
    setActionError('');
    try {
      const payload = new FormData();
      payload.append('driver', JSON.stringify(editForm.driver));
      if (editImageFile) {
        payload.append('driverImage', editImageFile);
      }

      const res = await axios.put(`http://localhost:5000/api/drivers/${selectedDriverId}`, payload);
      setDrivers((prev) => prev.map((item) => (item._id === selectedDriverId ? res.data : item)));
      setEditImageFile(null);
      setIsEditing(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to update driver.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDriverId) return;
    if (!window.confirm('Delete this driver profile? This action cannot be undone.')) return;
    setActionLoading(true);
    setActionError('');
    try {
      await axios.delete(`http://localhost:5000/api/drivers/${selectedDriverId}`);
      const remaining = drivers.filter((item) => item._id !== selectedDriverId);
      setDrivers(remaining);
      setSelectedDriverId(remaining[0]?._id || '');
      setIsEditing(false);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to delete driver.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="drivers-page animate-fade-in">
      <div className="drivers-header">
        <div>
          <h1>Drivers Directory</h1>
          <p>View, sort, and inspect all saved PUV driver profiles.</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => navigate('/drivers/new')}>
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      <div className="glass-panel driver-filters">
        <input
          type="text"
          className="input-field"
          placeholder="Search by CPDO ID, name, body no, license, or plate..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="input-field" value={barangayFilter} onChange={(e) => setBarangayFilter(e.target.value)}>
          <option value="all">All Barangay</option>
          {barangayOptions.map((barangay) => (
            <option key={barangay} value={barangay}>{barangay}</option>
          ))}
        </select>
        <select className="input-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Category</option>
          <option value="Tricycle">Tricycle</option>
          <option value="Jeepney">Jeepney</option>
          <option value="Mini Bus">Mini Bus</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-panel drivers-state">Loading drivers...</div>
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
                      Driver Name <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('unit.zone')}>
                      Zone <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('driverType')}>
                      Vehicle Type <ArrowUpDown size={14} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pagedDrivers.map((driver) => (
                  <tr
                    key={driver._id}
                    onClick={() => setSelectedDriverId(driver._id)}
                    className={selectedDriverId === driver._id ? 'selected-row' : ''}
                  >
                    <td style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{driver.unit?.bodyNo || '-'}</td>
                    <td>{driver.firstName} {driver.lastName}</td>
                    <td>{driver.unit?.vehicleType === 'Tricycle' ? (driver.unit?.zone || 'No Zone') : 'N/A'}</td>
                    <td>
                      <span className={`status-type ${String(driver.driverType || 'Tricycle').toLowerCase().replace(' ', '-')}`}>
                        {driver.driverType === 'Jeepney' ? <Truck size={14} /> : 
                         driver.driverType === 'Mini Bus' ? <Bus size={14} /> : 
                         <Bike size={14} />}
                        {' '}{driver.driverType || 'Tricycle'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedDrivers.length === 0 && (
              <p className="details-empty no-results">No drivers matched your filters.</p>
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
              <h2>Driver Details</h2>
              {selectedDriver && !isEditing && (
                <div className="details-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)}>Edit</button>
                  <button type="button" className="btn-danger" onClick={handleDelete} disabled={actionLoading}>
                    {actionLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
            {actionError && <p className="action-error">{actionError}</p>}
            {!selectedDriver ? (
              <p className="details-empty">Select a driver to view full details.</p>
            ) : isEditing ? (
              <form className="edit-form" onSubmit={handleUpdate}>
                <div className="edit-photo-group">
                  <label>Replace Driver Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="input-field"
                    onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                  />
                  {(editImageFile || selectedDriver.photoUrl) && (
                    <img
                      src={editImageFile ? URL.createObjectURL(editImageFile) : selectedDriver.photoUrl}
                      alt="Driver preview"
                      className="details-photo"
                    />
                  )}
                </div>
                <div className="edit-grid">
                  <div className="edit-form-group">
                    <label>CPDO ID</label>
                    <input name="cpdoId" className="input-field" value={editForm.driver.cpdoId} onChange={handleEditChange('driver')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>First Name</label>
                    <input name="firstName" className="input-field" value={editForm.driver.firstName} onChange={handleEditChange('driver')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Middle Name</label>
                    <input name="middleName" className="input-field" value={editForm.driver.middleName} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Last Name</label>
                    <input name="lastName" className="input-field" value={editForm.driver.lastName} onChange={handleEditChange('driver')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>License No.</label>
                    <input name="licenseNo" className="input-field" value={editForm.driver.licenseNo} onChange={handleEditChange('driver')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>License Expiry</label>
                    <input type="date" name="licenseExpiryDate" className="input-field" value={editForm.driver.licenseExpiryDate} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Restrictions</label>
                    <input name="licenseRestrictions" className="input-field" value={editForm.driver.licenseRestrictions} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Operator</label>
                    <select name="operator" className="input-field" value={editForm.driver.operator} onChange={(e) => {
                      const opId = e.target.value;
                      const op = operators.find(o => o._id === opId);
                      const fallbackUnit = op?.units?.[0]?._id || '';
                      setEditForm(prev => ({ ...prev, driver: { ...prev.driver, operator: opId, unit: fallbackUnit }}));
                    }}>
                      <option value="">Select Operator...</option>
                      {operators.map(op => <option key={op._id} value={op._id}>{op.firstName} {op.lastName}</option>)}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Unit (Body # / Plate #)</label>
                    <select name="unit" className="input-field" value={editForm.driver.unit} onChange={handleEditChange('driver')} disabled={!editForm.driver.operator}>
                      <option value="">Select Unit...</option>
                      {(operators.find(o => o._id === editForm.driver.operator)?.units || []).map(u => (
                        <option key={u._id} value={u._id}>Body #{u.bodyNo} | Plate {u.plateNo || '-'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Contact No.</label>
                    <input name="contactNo" className="input-field" value={editForm.driver.contactNo} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Address No.</label>
                    <input name="addressNo" className="input-field" value={editForm.driver.addressNo} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Street</label>
                    <input name="street" className="input-field" value={editForm.driver.street} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Purok</label>
                    <input name="purok" className="input-field" value={editForm.driver.purok} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Barangay</label>
                    <input name="barangay" className="input-field" value={editForm.driver.barangay} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>City/Municipality</label>
                    <input name="cityMunicipality" className="input-field" value={editForm.driver.cityMunicipality} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Status</label>
                    <select name="status" className="input-field" value={editForm.driver.status} onChange={handleEditChange('driver')}>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                    </select>
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
                {selectedDriver.photoUrl ? (
                  <div className="details-photo-wrap">
                    <img src={selectedDriver.photoUrl} alt={`${selectedDriver.firstName} ${selectedDriver.lastName}`} className="details-photo" />
                  </div>
                ) : null}
                <div><span>CPDO ID:</span><strong>{selectedDriver.cpdoId}</strong></div>
                <div><span>Name:</span><strong>{selectedDriver.firstName} {selectedDriver.lastName}</strong></div>
                <div><span>License:</span><strong>{selectedDriver.licenseNo}</strong></div>
                <div><span>Expiry:</span><strong>{selectedDriver.licenseExpiryDate || '-'}</strong></div>
                <div><span>Restrictions:</span><strong>{selectedDriver.licenseRestrictions || '-'}</strong></div>
                <div><span>Body No:</span><strong>{selectedDriver.unit?.bodyNo || '-'}</strong></div>
                <div><span>Plate No:</span><strong>{selectedDriver.unit?.plateNo || '-'}</strong></div>
                <div><span>Operator:</span><strong>{selectedDriver.operator?.firstName} {selectedDriver.operator?.lastName}</strong></div>
                <div><span>Operator Area:</span><strong>{selectedDriver.operator?.barangay || '-'}, {selectedDriver.operator?.cityMunicipality || '-'}</strong></div>
                <div><span>Contact:</span><strong>{selectedDriver.contactNo || '-'}</strong></div>
                <div><span>Status:</span><strong>{selectedDriver.status || 'Active'}</strong></div>
                <div className="details-full"><span>Driver Address:</span><strong>{selectedDriver.addressNo || '-'} {selectedDriver.street || ''} {selectedDriver.purok || ''} {selectedDriver.barangay || ''} {selectedDriver.cityMunicipality || ''}</strong></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriversList;
