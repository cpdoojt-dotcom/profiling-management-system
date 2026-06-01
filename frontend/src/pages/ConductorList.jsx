import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpDown, Plus, Bus, FileSpreadsheet, X } from 'lucide-react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { formatAddress } from '../utils/formatUtils';
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

const getFullName = (person) => {
  if (!person) return '';
  const parts = [person.firstName, person.middleName, person.lastName];
  if (person.extensionName) parts.push(person.extensionName);
  return parts
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

const getFormattedBirthdate = (person) => {
  if (!person || !person.birthMonth) return '-';
  const monthStr = person.birthMonth.trim();
  const dateVal = person.birthDate;
  const yearVal = person.birthYear;
  
  const month = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).toLowerCase();
  
  if (dateVal && yearVal) {
    return `${month} ${dateVal}, ${yearVal}`;
  }
  if (dateVal) {
    return `${month} ${dateVal}`;
  }
  if (yearVal) {
    return `${month}, ${yearVal}`;
  }
  return month;
};

const sanitize = (value) => String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const computeAge = (birthMonth, birthDate, birthYear) => {
  if (!birthMonth || !birthYear) return '';
  const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === String(birthMonth).toLowerCase());
  if (monthIndex === -1) return '';
  const day = birthDate ? Number(birthDate) : 1;
  const year = Number(birthYear);
  const today = new Date();
  const birth = new Date(year, monthIndex, day);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

const ConductorList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState('lastName');
  const [direction, setDirection] = useState('desc');
  const [selectedConductorId, setSelectedConductorId] = useState('');
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [operators, setOperators] = useState([]);
  const [editForm, setEditForm] = useState({
    conductor: {
      firstName: '', lastName: '', middleName: '', extensionName: '', status: 'Active',
      operator: '', unit: '',
      birthPlace: '', gender: 'Male', civilStatus: '', age: '',
      birthMonth: '', birthDate: '', birthYear: '',
      addressNo: '', street: '', purok: '', barangay: '', cityMunicipality: '', contactNo: '',
      emergencyContactName: '', emergencyContactNo: '', emergencyContactAddress: ''
    },
  });
  const pageSize = 8;
  const searchParams = new URLSearchParams(location.search);
  const selectedFromQuery = searchParams.get('conductorId');
  const typeFromQuery = searchParams.get('type');

  const fetchConductors = async () => {
    const res = await axios.get('/api/conductors');
    setConductors(res.data);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchConductors();
        const opRes = await axios.get('/api/operators');
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
    if (typeFromQuery) {
      setVehicleTypeFilter(typeFromQuery);
    }
  }, [selectedFromQuery, typeFromQuery]);

  const zoneOptions = useMemo(() => {
    const dynamicZones = new Set(conductors.map((c) => c.unit?.zone).filter(Boolean));
    const conductorZones = ['OZ', 'OB'];
    conductorZones.forEach((z) => dynamicZones.add(z));
    return [...dynamicZones].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [conductors]);

  const filteredConductors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return conductors.filter((c) => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const matchesQuery = !normalizedQuery
        || fullName.includes(normalizedQuery)
        || String(c.unit?.plateNo || '').toLowerCase().includes(normalizedQuery)
        || String(c.unit?.bodyNo || '').toLowerCase().includes(normalizedQuery);
      const matchesZone = !zoneFilter || c.unit?.zone === zoneFilter;
      const matchesVehicleType = !vehicleTypeFilter || c.unit?.vehicleType === vehicleTypeFilter;
      return matchesQuery && matchesZone && matchesVehicleType;
    });
  }, [conductors, query, zoneFilter, vehicleTypeFilter]);

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
  }, [query, zoneFilter]);

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
        extensionName: selectedConductor.extensionName || '',
        status: selectedConductor.status || 'Active',
        operator: selectedConductor.operator?._id || selectedConductor.operator || '',
        unit: selectedConductor.unit?._id || selectedConductor.unit || '',
        birthPlace: selectedConductor.birthPlace || '',
        age: selectedConductor.age || '',
        gender: selectedConductor.gender || 'Male',
        civilStatus: selectedConductor.civilStatus || '',
        birthMonth: selectedConductor.birthMonth || '',
        birthDate: selectedConductor.birthDate || '',
        birthYear: selectedConductor.birthYear || '',
        addressNo: selectedConductor.addressNo || '',
        street: selectedConductor.street || '',
        purok: selectedConductor.purok || '',
        barangay: selectedConductor.barangay || '',
        cityMunicipality: selectedConductor.cityMunicipality || '',
        contactNo: selectedConductor.contactNo || '',
        emergencyContactName: selectedConductor.emergencyContactName || '',
        emergencyContactNo: selectedConductor.emergencyContactNo || '',
        emergencyContactAddress: selectedConductor.emergencyContactAddress || '',
      },
    });
    setEditImageFile(null);
    setActionError('');
  }, [selectedConductorId, selectedConductor]);

  // Auto-compute age in edit form from birth fields
  useEffect(() => {
    const c = editForm.conductor;
    const computed = computeAge(c.birthMonth, c.birthDate, c.birthYear);
    if (computed !== '') {
      setEditForm(prev => ({ ...prev, conductor: { ...prev.conductor, age: computed } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.conductor.birthMonth, editForm.conductor.birthDate, editForm.conductor.birthYear]);

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
    let finalValue = value;
    if (['firstName', 'lastName', 'middleName', 'extensionName', 'birthPlace', 'emergencyContactName', 'civilStatus', 'addressNo', 'street', 'purok', 'barangay', 'cityMunicipality'].includes(name)) {
      finalValue = value.toUpperCase();
    }
    setEditForm((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [name]: finalValue,
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

      const res = await axios.put(`/api/conductors/${selectedConductorId}`, payload);
      setConductors((prev) => prev.map((item) => (item._id === selectedConductorId ? res.data : item)));
      setEditImageFile(null);
      toast.success('Conductor profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to update conductor.';
      setActionError(msg);
      toast.error(msg);
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
      await axios.delete(`/api/conductors/${selectedConductorId}`);
      const remaining = conductors.filter((item) => item._id !== selectedConductorId);
      setConductors(remaining);
      setSelectedConductorId(remaining[0]?._id || '');
      toast.success('Conductor profile deleted.');
      setIsEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete conductor.';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (conductors.length === 0) {
      toast.error('No conductors available to export.');
      return;
    }

    const headers = [
      'NO.',
      'FIRST NAME',
      'MIDDLE NAME',
      'LAST NAME',
      'EXTENSION',
      'FULL NAME',
      'GENDER',
      'CIVIL STATUS',
      'BIRTH PLACE',
      'ADDRESS',
      'CONTACT NO',
      'STATUS',
      'OPERATOR NAME',
      'OPERATOR BARANGAY',
      'OPERATOR CITY/MUNICIPALITY',
      'UNIT BODY NO',
      'UNIT PLATE NO',
      'UNIT VEHICLE TYPE',
      'UNIT LTFRB CASE NO',
      'EMERGENCY CONTACT NAME',
      'EMERGENCY CONTACT NO',
      'EMERGENCY CONTACT ADDRESS',
      'CREATED AT',
      'UPDATED AT',
    ];

    const rows = conductors.map((conductor, index) => ([
      index + 1,
      sanitize(conductor.firstName),
      sanitize(conductor.middleName),
      sanitize(conductor.lastName),
      sanitize(conductor.extensionName),
      sanitize(getFullName(conductor)),
      sanitize(conductor.gender),
      sanitize(conductor.civilStatus),
      sanitize(conductor.birthPlace),
      sanitize(formatAddress(conductor)),
      sanitize(conductor.contactNo),
      sanitize(conductor.status),
      sanitize(getFullName(conductor.operator)),
      sanitize(conductor.operator?.barangay),
      sanitize(conductor.operator?.cityMunicipality),
      sanitize(conductor.unit?.bodyNo),
      sanitize(conductor.unit?.plateNo),
      sanitize(conductor.unit?.vehicleType || 'Mini Bus'),
      sanitize(conductor.unit?.ltfrbMchCaseNo),
      sanitize(conductor.emergencyContactName),
      sanitize(conductor.emergencyContactNo),
      sanitize(conductor.emergencyContactAddress),
      sanitize(conductor.createdAt ? new Date(conductor.createdAt).toLocaleString('en-PH') : ''),
      sanitize(conductor.updatedAt ? new Date(conductor.updatedAt).toLocaleString('en-PH') : ''),
    ]));

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Conductors');

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
      link.download = `conductors-directory-${timestamp}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Conductors exported to Excel successfully.');
    } catch (err) {
      toast.error('Failed to export conductors to Excel.');
    }
  };

  return (
    <div className="drivers-page animate-fade-in">
      <div className="drivers-header">
        <div>
          <h1>Conductors Directory</h1>
          <p>View, sort, and inspect all saved Mini Bus conductor profiles.</p>
        </div>
        <div className="drivers-header-actions">
          <button className="btn-secondary export-btn" type="button" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button className="btn-primary" type="button" onClick={() => navigate('/conductors/new')}>
            <Plus size={18} />
            Add Conductor
          </button>
        </div>
      </div>

      <div className="glass-panel driver-filters">
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: '2.5rem' }}
            placeholder="Search by body number or conductor name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button 
              type="button" 
              className="input-clear-btn"
              onClick={() => setQuery('')}
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <select className="input-field" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
          <option value="">All Zones</option>
          {zoneOptions.map((zone) => (
            <option key={zone} value={zone}>{zone}</option>
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
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {c.photoUrl ? (
                          <img 
                            src={c.photoUrl} 
                            alt={getFullName(c)} 
                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-color)', cursor: 'pointer' }} 
                            onClick={(e) => { e.stopPropagation(); setModalImageUrl(c.photoUrl); setImageModalOpen(true); }}
                          />
                        ) : (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent-glow)', border: '1px solid var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', color: 'var(--accent-color)' }}>
                            {(c.firstName?.[0] || '').toUpperCase()}
                          </div>
                        )}
                        {getFullName(c)}
                      </div>
                    </td>
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
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setModalImageUrl(editImageFile ? URL.createObjectURL(editImageFile) : selectedConductor.photoUrl); setImageModalOpen(true); }}
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
                    <label>Extension Name (Jr., Sr., III)</label>
                    <input name="extensionName" className="input-field" value={editForm.conductor.extensionName} onChange={handleEditChange('conductor')} placeholder="e.g. JR, SR, III" />
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
                    <label>Age {editForm.conductor.birthYear ? <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>(auto-computed)</span> : ''}</label>
                    <input
                      name="age" type="number" className="input-field" value={editForm.conductor.age}
                      onChange={handleEditChange('conductor')}
                      readOnly={!!(editForm.conductor.birthMonth && editForm.conductor.birthYear)}
                      style={editForm.conductor.birthMonth && editForm.conductor.birthYear ? { opacity: 0.7, background: 'var(--surface-bg)' } : {}}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Birth Month</label>
                    <select name="birthMonth" className="input-field" value={editForm.conductor.birthMonth} onChange={handleEditChange('conductor')}>
                      <option value="">-- Month --</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Birth Date (Day)</label>
                    <input name="birthDate" type="number" min="1" max="31" className="input-field" value={editForm.conductor.birthDate} onChange={handleEditChange('conductor')} placeholder="DD" />
                  </div>
                  <div className="edit-form-group">
                    <label>Birth Year</label>
                    <input name="birthYear" type="number" min="1900" max="2100" className="input-field" value={editForm.conductor.birthYear} onChange={handleEditChange('conductor')} placeholder="YYYY" />
                  </div>
                  <div className="edit-form-group">
                    <label>Address No.</label>
                    <input name="addressNo" className="input-field" value={editForm.conductor.addressNo} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Street</label>
                    <input name="street" className="input-field" value={editForm.conductor.street} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Purok</label>
                    <input name="purok" className="input-field" value={editForm.conductor.purok} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Barangay</label>
                    <input name="barangay" className="input-field" value={editForm.conductor.barangay} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>City/Municipality</label>
                    <input name="cityMunicipality" className="input-field" value={editForm.conductor.cityMunicipality} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Contact No.</label>
                    <input name="contactNo" className="input-field" value={editForm.conductor.contactNo} onChange={handleEditChange('conductor')} />
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
                    <img 
                      src={selectedConductor.photoUrl} 
                      alt={`${selectedConductor.firstName} ${selectedConductor.lastName}`} 
                      className="details-photo" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setModalImageUrl(selectedConductor.photoUrl); setImageModalOpen(true); }}
                    />
                  </div>
                ) : null}
                <div><span>Name:</span><strong>{getFullName(selectedConductor)}</strong></div>
                <div><span>Gender:</span><strong>{selectedConductor.gender || '-'}</strong></div>
                <div><span>Body No:</span><strong>{selectedConductor.unit?.bodyNo || '-'}</strong></div>
                <div><span>Plate No:</span><strong>{selectedConductor.unit?.plateNo || '-'}</strong></div>
                <div><span>Birth Place:</span><strong>{selectedConductor.birthPlace || '-'}</strong></div>
                <div><span>Birthdate:</span><strong>{getFormattedBirthdate(selectedConductor)}</strong></div>
                <div><span>Age:</span><strong>{computeAge(selectedConductor.birthMonth, selectedConductor.birthDate, selectedConductor.birthYear) || '-'}</strong></div>
                <div><span>Civil Status:</span><strong>{selectedConductor.civilStatus || '-'}</strong></div>
                <div><span>Contact:</span><strong>{selectedConductor.contactNo || '-'}</strong></div>
                <div className="details-full"><span>Complete Address:</span><strong>{formatAddress(selectedConductor)}</strong></div>
                <div><span>Operator:</span><strong>{getFullName(selectedConductor.operator)}</strong></div>
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

      {/* Image Modal */}
      {imageModalOpen && (
        <div 
          className="image-modal-overlay" 
          onClick={() => setImageModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            cursor: 'pointer'
          }}
        >
          <img 
            src={modalImageUrl} 
            alt="Full size" 
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              objectFit: 'contain',
              borderRadius: '8px'
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            onClick={() => setImageModalOpen(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              cursor: 'pointer',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default ConductorList;
