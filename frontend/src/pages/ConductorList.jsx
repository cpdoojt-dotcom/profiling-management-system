import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowUpDown, Plus, Bus, FileSpreadsheet, X } from 'lucide-react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatAddress } from '../utils/formatUtils';
import { TableSkeleton, CardSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import ImageWithLoader from '../components/ImageWithLoader';
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
  const { user } = useAuth();
  const [conductors, setConductors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState('lastName');
  const [direction, setDirection] = useState('desc');
  const [selectedConductorId, setSelectedConductorId] = useState('');
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState(['all']);
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneDropdownPosition, setZoneDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const zoneButtonRef = useRef(null);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [operators, setOperators] = useState([]);
  const [formErrors, setFormErrors] = useState({});
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

  const validateForm = () => {
    const errors = {};
    const c = editForm.conductor;

    if (!c.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (c.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }

    if (!c.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (c.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }

    if (c.contactNo && !/^[0-9]{11}$/.test(c.contactNo.replace(/\s/g, ''))) {
      errors.contactNo = 'Contact number must be 11 digits';
    }

    if (c.emergencyContactNo && !/^[0-9]{11}$/.test(c.emergencyContactNo.replace(/\s/g, ''))) {
      errors.emergencyContactNo = 'Emergency contact number must be 11 digits';
    }

    if (c.birthDate && (c.birthDate < 1 || c.birthDate > 31)) {
      errors.birthDate = 'Birth date must be between 1 and 31';
    }

    if (c.birthYear && (c.birthYear < 1900 || c.birthYear > new Date().getFullYear())) {
      errors.birthYear = `Birth year must be between 1900 and ${new Date().getFullYear()}`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

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
      const matchesZone = zoneFilter.includes('all') || zoneFilter.includes(c.unit?.zone);
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
    setFormErrors({});
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

  const handleZoneToggle = (zone) => {
    if (zone === 'all') {
      setZoneFilter(['all']);
    } else {
      setZoneFilter(prev => {
        if (prev.includes('all')) {
          return [zone];
        }
        if (prev.includes(zone)) {
          const newFilter = prev.filter(z => z !== zone);
          return newFilter.length === 0 ? ['all'] : newFilter;
        }
        return [...prev, zone];
      });
    }
  };

  const handleZoneButtonClick = () => {
    if (zoneButtonRef.current) {
      const rect = zoneButtonRef.current.getBoundingClientRect();
      setZoneDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
    setZoneDropdownOpen(!zoneDropdownOpen);
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
    // Clear error for the field being edited
    if (formErrors[name]) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedConductorId) return;
    
    // Validate form before submission
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }
    
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
      setFormErrors({});
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
    const dataToExport = sortedConductors;
    if (dataToExport.length === 0) {
      toast.error('No conductors matched your current filters to export.');
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

    const rows = dataToExport.map((conductor, index) => ([
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
      let fileName = 'conductors';
      if (!zoneFilter.includes('all') && zoneFilter.length > 0) {
        const zonesStr = zoneFilter.map(z => z.toLowerCase().replace(/\s+/g, '-')).join('-');
        fileName = `${zonesStr}-${fileName}`;
      }
      fileName += `-${timestamp}.xlsx`;
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
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
          {user?.role !== 'otmps' && (
            <button className="btn-primary" type="button" onClick={() => navigate('/conductors/new')}>
              <Plus size={18} />
              Add Conductor
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel driver-filters" role="search" aria-label="Filter conductors">
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: '2.5rem' }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, body no, or plate no..."
            aria-label="Search conductors"
          />
          {query && (
            <button 
              type="button" 
              className="input-clear-btn"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div style={{ position: 'relative', maxWidth: '200px' }}>
          <button
            ref={zoneButtonRef}
            type="button"
            className="input-field"
            style={{ textAlign: 'left', cursor: 'pointer', maxWidth: '200px' }}
            onClick={handleZoneButtonClick}
            aria-label="Filter by zone"
          >
            {zoneFilter.includes('all') ? 'All Zones' : zoneFilter.join(', ')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel">
          <TableSkeleton rows={8} columns={3} />
        </div>
      ) : error ? (
        <div className="glass-panel drivers-state" role="alert">{error}</div>
      ) : (
        <div className="drivers-layout">
          <div className="glass-panel drivers-table-wrap">
            <table className="drivers-table" role="grid" aria-label="Conductors directory">
              <thead>
                <tr>
                  <th scope="col">
                    <button type="button" className="sort-btn" onClick={() => handleSort('unit.bodyNo')} aria-label="Sort by body number">
                      Body # <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th scope="col">
                    <button type="button" className="sort-btn" onClick={() => handleSort('lastName')} aria-label="Sort by conductor name">
                      Conductor Name <ArrowUpDown size={14} />
                    </button>
                  </th>
                  <th scope="col">
                    <button type="button" className="sort-btn" onClick={() => handleSort('status')} aria-label="Sort by zone">
                      Zone <ArrowUpDown size={14} />
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
                    tabIndex={0}
                    role="button"
                    aria-selected={selectedConductorId === c._id}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedConductorId(c._id);
                      }
                    }}
                  >
                    <td style={{ fontWeight: '700', color: 'var(--accent-color)' }}>{c.unit?.bodyNo || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ImageWithLoader 
                          src={c.photoUrl || '/default.jpg'}
                          alt={`${getFullName(c)} profile photo`}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-color)', cursor: 'pointer' }} 
                          onClick={(e) => { e.stopPropagation(); setModalImageUrl(c.photoUrl || '/default.jpg'); setImageModalOpen(true); }}
                        />
                        {getFullName(c)}
                      </div>
                    </td>
                    <td>
                      <span className={`status-type mini-bus`}>
                        {c.unit?.zone || '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedConductors.length === 0 && (
              <EmptyState 
                type={query || zoneFilter ? 'search' : 'no-users'}
                message={query || zoneFilter ? 'No conductors matched your filters' : 'No conductors found'}
              />
            )}
            <div className="pagination" role="navigation" aria-label="Pagination">
              <button type="button" className="btn-secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                Previous
              </button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" className="btn-secondary" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                Next
              </button>
            </div>
          </div>

          <div className="glass-panel driver-details" role="region" aria-label="Conductor details panel">
            <div className="details-header">
              <h2>Conductor Details</h2>
              {selectedConductor && !isEditing && user?.role !== 'otmps' && (
                <div className="details-actions">
                  <button type="button" className="btn-secondary" onClick={() => setIsEditing(true)} aria-label="Edit conductor profile">Edit</button>
                  <button type="button" className="btn-danger" onClick={handleDelete} disabled={actionLoading} aria-label="Delete conductor profile">
                    {actionLoading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              )}
            </div>
            {actionError && <p className="action-error" role="alert">{actionError}</p>}
            {!selectedConductor ? (
              <EmptyState type="no-data" message="Select a conductor to view full details" />
            ) : isEditing ? (
              <form className="edit-form" onSubmit={handleUpdate} aria-label="Edit conductor form">
                <div className="edit-photo-group">
                  <label htmlFor="conductor-photo">Replace Conductor Photo</label>
                  <input
                    id="conductor-photo"
                    type="file"
                    accept="image/*"
                    className="input-field"
                    onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                    aria-label="Upload conductor photo"
                  />
                  {(editImageFile || selectedConductor.photoUrl) && (
                    <ImageWithLoader
                      src={editImageFile ? URL.createObjectURL(editImageFile) : selectedConductor.photoUrl}
                      alt={`${getFullName(selectedConductor)} profile photo preview`}
                      className="details-photo"
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setModalImageUrl(editImageFile ? URL.createObjectURL(editImageFile) : selectedConductor.photoUrl); setImageModalOpen(true); }}
                    />
                  )}
                </div>
                <div className="edit-grid">
                  <div className="edit-form-group">
                    <label htmlFor="firstName">First Name</label>
                    <input id="firstName" name="firstName" className={`input-field ${formErrors.firstName ? 'input-error' : ''}`} value={editForm.conductor.firstName} onChange={handleEditChange('conductor')} required aria-required="true" aria-invalid={!!formErrors.firstName} aria-describedby={formErrors.firstName ? 'firstName-error' : undefined} />
                    {formErrors.firstName && <span id="firstName-error" className="field-error">{formErrors.firstName}</span>}
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="middleName">Middle Name</label>
                    <input id="middleName" name="middleName" className="input-field" value={editForm.conductor.middleName} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="lastName">Last Name</label>
                    <input id="lastName" name="lastName" className={`input-field ${formErrors.lastName ? 'input-error' : ''}`} value={editForm.conductor.lastName} onChange={handleEditChange('conductor')} required aria-required="true" aria-invalid={!!formErrors.lastName} aria-describedby={formErrors.lastName ? 'lastName-error' : undefined} />
                    {formErrors.lastName && <span id="lastName-error" className="field-error">{formErrors.lastName}</span>}
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="extensionName">Extension Name (Jr., Sr., III)</label>
                    <input id="extensionName" name="extensionName" className="input-field" value={editForm.conductor.extensionName} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="gender">Gender</label>
                    <select id="gender" name="gender" className="input-field" value={editForm.conductor.gender} onChange={handleEditChange('conductor')}>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="civilStatus">Civil Status</label>
                    <input id="civilStatus" name="civilStatus" className="input-field" value={editForm.conductor.civilStatus} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="operator">Operator</label>
                    <select id="operator" name="operator" className="input-field" value={editForm.conductor.operator} onChange={(e) => {
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
                    <label htmlFor="unit">Mini Bus Unit</label>
                    <select id="unit" name="unit" className="input-field" value={editForm.conductor.unit} onChange={handleEditChange('conductor')} disabled={!editForm.conductor.operator}>
                      <option value="">Select Unit...</option>
                      {(operators.find(o => o._id === editForm.conductor.operator)?.units || []).filter(u => u.vehicleType === 'Mini Bus').map(u => (
                        <option key={u._id} value={u._id}>Body #{u.bodyNo} | Plate {u.plateNo || '-'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="birthPlace">Birth Place</label>
                    <input id="birthPlace" name="birthPlace" className="input-field" value={editForm.conductor.birthPlace} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="age">Age {editForm.conductor.birthYear ? <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>(auto-computed)</span> : ''}</label>
                    <input
                      id="age" name="age" type="number" className="input-field" value={editForm.conductor.age}
                      onChange={handleEditChange('conductor')}
                      readOnly={!!(editForm.conductor.birthMonth && editForm.conductor.birthYear)}
                      style={editForm.conductor.birthMonth && editForm.conductor.birthYear ? { opacity: 0.7, background: 'var(--surface-bg)' } : {}}
                      aria-readonly={!!(editForm.conductor.birthMonth && editForm.conductor.birthYear)}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="birthMonth">Birth Month</label>
                    <select id="birthMonth" name="birthMonth" className="input-field" value={editForm.conductor.birthMonth} onChange={handleEditChange('conductor')}>
                      <option value="">-- Month --</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="birthDate">Birth Date (Day)</label>
                    <input id="birthDate" name="birthDate" type="number" min="1" max="31" className={`input-field ${formErrors.birthDate ? 'input-error' : ''}`} value={editForm.conductor.birthDate} onChange={handleEditChange('conductor')} aria-invalid={!!formErrors.birthDate} aria-describedby={formErrors.birthDate ? 'birthDate-error' : undefined} />
                    {formErrors.birthDate && <span id="birthDate-error" className="field-error">{formErrors.birthDate}</span>}
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="birthYear">Birth Year</label>
                    <input id="birthYear" name="birthYear" type="number" min="1900" max="2100" className={`input-field ${formErrors.birthYear ? 'input-error' : ''}`} value={editForm.conductor.birthYear} onChange={handleEditChange('conductor')} aria-invalid={!!formErrors.birthYear} aria-describedby={formErrors.birthYear ? 'birthYear-error' : undefined} />
                    {formErrors.birthYear && <span id="birthYear-error" className="field-error">{formErrors.birthYear}</span>}
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="addressNo">Address No.</label>
                    <input id="addressNo" name="addressNo" className="input-field" value={editForm.conductor.addressNo} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="street">Street</label>
                    <input id="street" name="street" className="input-field" value={editForm.conductor.street} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="purok">Purok</label>
                    <input id="purok" name="purok" className="input-field" value={editForm.conductor.purok} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="barangay">Barangay</label>
                    <input id="barangay" name="barangay" className="input-field" value={editForm.conductor.barangay} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="cityMunicipality">City/Municipality</label>
                    <input id="cityMunicipality" name="cityMunicipality" className="input-field" value={editForm.conductor.cityMunicipality} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="contactNo">Contact No.</label>
                    <input id="contactNo" name="contactNo" className={`input-field ${formErrors.contactNo ? 'input-error' : ''}`} value={editForm.conductor.contactNo} onChange={handleEditChange('conductor')} aria-invalid={!!formErrors.contactNo} aria-describedby={formErrors.contactNo ? 'contactNo-error' : undefined} />
                    {formErrors.contactNo && <span id="contactNo-error" className="field-error">{formErrors.contactNo}</span>}
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="status">Status</label>
                    <select id="status" name="status" className="input-field" value={editForm.conductor.status} onChange={handleEditChange('conductor')}>
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <h3 className="section-title" style={{ marginTop: '1.5rem' }}>Emergency Contact</h3>
                <div className="edit-grid">
                  <div className="edit-form-group">
                    <label htmlFor="emergencyContactName">Person to Notify</label>
                    <input id="emergencyContactName" name="emergencyContactName" className="input-field" value={editForm.conductor.emergencyContactName} onChange={handleEditChange('conductor')} />
                  </div>
                  <div className="edit-form-group">
                    <label htmlFor="emergencyContactNo">Contact No.</label>
                    <input id="emergencyContactNo" name="emergencyContactNo" className={`input-field ${formErrors.emergencyContactNo ? 'input-error' : ''}`} value={editForm.conductor.emergencyContactNo} onChange={handleEditChange('conductor')} aria-invalid={!!formErrors.emergencyContactNo} aria-describedby={formErrors.emergencyContactNo ? 'emergencyContactNo-error' : undefined} />
                    {formErrors.emergencyContactNo && <span id="emergencyContactNo-error" className="field-error">{formErrors.emergencyContactNo}</span>}
                  </div>
                  <div className="edit-form-group" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor="emergencyContactAddress">Emergency Contact Address</label>
                    <input id="emergencyContactAddress" name="emergencyContactAddress" className="input-field" value={editForm.conductor.emergencyContactAddress} onChange={handleEditChange('conductor')} />
                  </div>
                </div>

                <div className="edit-actions">
                  <button type="button" className="btn-secondary" onClick={() => { setIsEditing(false); setEditImageFile(null); setFormErrors({}); }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={actionLoading} aria-live="polite">
                    {actionLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="details-grid">
                <div className="details-photo-wrap">
                  <ImageWithLoader 
                    src={selectedConductor.photoUrl || '/default.jpg'}
                    alt={`${selectedConductor.firstName} ${selectedConductor.lastName}`} 
                    className="details-photo" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setModalImageUrl(selectedConductor.photoUrl || '/default.jpg'); setImageModalOpen(true); }}
                  />
                </div>
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
            zIndex: 100000,
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
      {zoneDropdownOpen && createPortal(
        <div style={{ position: 'fixed', top: zoneDropdownPosition.top, left: zoneDropdownPosition.left, width: zoneDropdownPosition.width, zIndex: 99999, background: 'var(--surface-bg)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', maxHeight: '200px', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '0.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem 0' }}>
              <input
                type="checkbox"
                checked={zoneFilter.includes('all')}
                onChange={() => handleZoneToggle('all')}
              />
              All Zones
            </label>
            {zoneOptions.map((zone) => (
              <label key={zone} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.25rem 0' }}>
                <input
                  type="checkbox"
                  checked={zoneFilter.includes(zone)}
                  onChange={() => handleZoneToggle(zone)}
                />
                {zone}
              </label>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ConductorList;
