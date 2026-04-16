import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpDown, Plus } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editForm, setEditForm] = useState({
    driver: {
      cpdoId: '',
      firstName: '',
      lastName: '',
      licenseNo: '',
      contactNo: '',
      status: 'Active',
    },
  });
  const pageSize = 8;
  const selectedFromQuery = new URLSearchParams(location.search).get('driverId');

  const fetchDrivers = async () => {
    const res = await axios.get('http://localhost:5000/api/drivers');
    setDrivers(res.data);
    if (res.data[0]?._id && !selectedDriverId) {
      setSelectedDriverId(res.data[0]._id);
    }
  };

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        await fetchDrivers();
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load drivers.');
      } finally {
        setLoading(false);
      }
    };
    loadDrivers();
  }, []);

  useEffect(() => {
    if (selectedFromQuery) {
      setSelectedDriverId(selectedFromQuery);
    }
  }, [selectedFromQuery]);

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
      const matchesStatus = statusFilter === 'all'
        || String(driver.status || 'Active').toLowerCase() === statusFilter;
      return matchesQuery && matchesBarangay && matchesStatus;
    });
  }, [drivers, query, barangayFilter, statusFilter]);

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
  }, [query, barangayFilter, statusFilter]);

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
        licenseNo: selectedDriver.licenseNo || '',
        contactNo: selectedDriver.contactNo || '',
        status: selectedDriver.status || 'Active',
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
        <select className="input-field" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
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
                    <button type="button" className="sort-btn" onClick={() => handleSort('lastName')}>
                      Driver Name <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('cpdoId')}>
                      CPDO ID <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('licenseNo')}>
                      License <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('status')}>
                      Status <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th>
                    <button type="button" className="sort-btn" onClick={() => handleSort('createdAt')}>
                      Added <ArrowUpDown size={14} />
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
                    <td>{driver.firstName} {driver.lastName}</td>
                    <td>{driver.cpdoId}</td>
                    <td>{driver.licenseNo}</td>
                    <td>{driver.status || 'Active'}</td>
                    <td>{new Date(driver.createdAt).toLocaleDateString()}</td>
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
                    <label>Driver First Name</label>
                    <input name="firstName" className="input-field" value={editForm.driver.firstName} onChange={handleEditChange('driver')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Driver Last Name</label>
                    <input name="lastName" className="input-field" value={editForm.driver.lastName} onChange={handleEditChange('driver')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>License No.</label>
                    <input name="licenseNo" className="input-field" value={editForm.driver.licenseNo} onChange={handleEditChange('driver')} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Contact No.</label>
                    <input name="contactNo" className="input-field" value={editForm.driver.contactNo} onChange={handleEditChange('driver')} />
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
