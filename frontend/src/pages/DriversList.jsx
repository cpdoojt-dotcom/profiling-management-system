import { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ArrowUpDown, Plus, Bike, Truck, Bus, FileSpreadsheet, X } from 'lucide-react';
import axios from 'axios';
import ExcelJS from 'exceljs';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { formatAddress } from '../utils/formatUtils';
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

const getFullName = (person) => {
  if (!person) return '';
  const parts = [person.firstName, person.middleName, person.lastName];
  if (person.extensionName) parts.push(person.extensionName);
  return parts
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '-';
  const num = Number(dateStr);
  if (!isNaN(num) && num > 0) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US');
    }
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US');
  }
  return dateStr;
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

const DriversList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const toast = useToast();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [sortBy, setSortBy] = useState('lastName');
  const [direction, setDirection] = useState('desc');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [query, setQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState(['all']);
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneDropdownPosition, setZoneDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const zoneButtonRef = useRef(null);
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [operators, setOperators] = useState([]);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [editForm, setEditForm] = useState({
    driver: {
      cpdoId: '', firstName: '', lastName: '', middleName: '', extensionName: '', licenseNo: '', licenseExpiryDate: '', contactNo: '',
      age: '', birthplace: '', birthMonth: '', birthDate: '', birthYear: '',
      addressNo: '', street: '', purok: '', barangay: '', cityMunicipality: '', operator: '', unit: ''
    },
  });
  const pageSize = 8;
  const searchParams = new URLSearchParams(location.search);
  const selectedFromQuery = searchParams.get('driverId');
  const typeFromQuery = searchParams.get('type');

  const fetchDrivers = async () => {
    const res = await axios.get('/api/drivers');
    setDrivers(res.data);
  };

  useEffect(() => {
    const loadDriversAndOperators = async () => {
      try {
        await fetchDrivers();
        const opRes = await axios.get('/api/operators');
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
      setVehicleTypeFilter(typeFromQuery);
    }
  }, [selectedFromQuery, typeFromQuery]);

  const zoneOptions = useMemo(() => {
    const dynamicZones = new Set(drivers.map((driver) => driver.unit?.zone).filter(Boolean));
    const predefined = [
      'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 8', 'Zone 9',
      'BB',
      'J01', 'J02', 'J03', 'J04', 'J05', 'J06', 'J07', 'J08', 'J09', 'J10', 'J11', 'J12', 'J13',
      'OB', 'OZ'
    ];
    predefined.forEach((z) => dynamicZones.add(z));
    return [...dynamicZones].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [drivers]);

  const filteredDrivers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return drivers.filter((driver) => {
      const fullName = getFullName(driver).toLowerCase();
      const matchesQuery = !normalizedQuery
        || fullName.includes(normalizedQuery)
        || String(driver.cpdoId || '').toLowerCase().includes(normalizedQuery)
        || String(driver.licenseNo || '').toLowerCase().includes(normalizedQuery)
        || String(driver.unit?.plateNo || '').toLowerCase().includes(normalizedQuery)
        || String(driver.unit?.bodyNo || '').toLowerCase().includes(normalizedQuery);
      const matchesZone = zoneFilter.includes('all') || zoneFilter.includes(driver.unit?.zone);
      const matchesVehicleType = !vehicleTypeFilter || driver.driverType === vehicleTypeFilter;
      return matchesQuery && matchesZone && matchesVehicleType;
    });
  }, [drivers, query, zoneFilter, vehicleTypeFilter]);

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
  }, [query, zoneFilter]);

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
        extensionName: selectedDriver.extensionName || '',
        licenseNo: selectedDriver.licenseNo || '',
        licenseExpiryDate: selectedDriver.licenseExpiryDate || '',
        contactNo: selectedDriver.contactNo || '',
        addressNo: selectedDriver.addressNo || '',
        street: selectedDriver.street || '',
        purok: selectedDriver.purok || '',
        barangay: selectedDriver.barangay || '',
        cityMunicipality: selectedDriver.cityMunicipality || '',
        birthplace: selectedDriver.birthplace || '',
        age: selectedDriver.age || '',
        birthMonth: selectedDriver.birthMonth ? (selectedDriver.birthMonth.charAt(0).toUpperCase() + selectedDriver.birthMonth.slice(1).toLowerCase()) : '',
        birthDate: selectedDriver.birthDate || '',
        birthYear: selectedDriver.birthYear || '',
        operator: selectedDriver.operator?._id || '',
        unit: selectedDriver.unit?._id || '',
      },
    });
    setEditImageFile(null);
    setActionError('');
  }, [selectedDriverId, selectedDriver]);

  // Auto-compute age in edit form from birth fields
  useEffect(() => {
    const d = editForm.driver;
    const computed = computeAge(d.birthMonth, d.birthDate, d.birthYear);
    if (computed !== '') {
      setEditForm(prev => ({ ...prev, driver: { ...prev.driver, age: computed } }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editForm.driver.birthMonth, editForm.driver.birthDate, editForm.driver.birthYear]);

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

    // Fields that should only contain letters and spaces
    const letterOnlyFields = ['firstName', 'lastName', 'middleName', 'barangay', 'cityMunicipality'];
    if (letterOnlyFields.includes(name)) {
      finalValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    // Fields that should only contain numbers
    if (name === 'contactNo') {
      finalValue = value.replace(/\D/g, '');
    }

    if (['cpdoId', 'licenseNo', 'firstName', 'lastName', 'middleName', 'extensionName', 'barangay', 'cityMunicipality', 'birthplace'].includes(name)) {
      finalValue = finalValue.toUpperCase();
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
    if (!selectedDriverId) return;
    if (!await confirm('Are you sure you want to save changes to this driver profile?')) return;
    setActionLoading(true);
    setActionError('');
    try {
      const payload = new FormData();
      payload.append('driver', JSON.stringify(editForm.driver));
      if (editImageFile) {
        payload.append('driverImage', editImageFile);
      }

      const res = await axios.put(`/api/drivers/${selectedDriverId}`, payload);
      setDrivers((prev) => prev.map((item) => (item._id === selectedDriverId ? res.data : item)));
      setEditImageFile(null);
      toast.success('Driver profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to update driver.';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDriverId) return;
    if (!await confirm('Delete this driver profile? This action cannot be undone.')) return;
    setActionLoading(true);
    setActionError('');
    try {
      await axios.delete(`/api/drivers/${selectedDriverId}`);
      const remaining = drivers.filter((item) => item._id !== selectedDriverId);
      setDrivers(remaining);
      setSelectedDriverId(remaining[0]?._id || '');
      toast.success('Driver profile deleted.');
      setIsEditing(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to delete driver.';
      setActionError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (sortedDrivers.length === 0) {
      toast.error('No drivers matched your current filters to export.');
      return;
    }

    const sanitize = (value) => String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();
    const headers = [
      'UNIT ZONE',
      'CPDO ID',
      'FIRST NAME',
      'MIDDLE NAME',
      'LAST NAME',
      'EXTENSION',
      'NAME',
      'DRIVER TYPE',
      'LICENSE NO',
      'LICENSE EXPIRY DATE',
      'CONTACT NO',
      'COMPLETE ADDRESS',
      'OPERATOR NAME',
      'OPERATOR BARANGAY',
      'OPERATOR CITY/MUNICIPALITY',
      'UNIT BODY NO',
      'UNIT PLATE NO',
      'UNIT VEHICLE TYPE',
      'UNIT LTFRB CASE NO',
      'UNIT COLOR CODE',
      'UNIT MAKE/TYPE',
      'UNIT MOTOR NO',
      'UNIT CHASSIS NO',
      'UNIT YEAR MODEL',
      'CREATED AT',
      'UPDATED AT',
    ];

    const sortedByZone = [...sortedDrivers].sort((a, b) => {
      const zoneA = a.unit?.zone || '';
      const zoneB = b.unit?.zone || '';
      return zoneA.localeCompare(zoneB);
    });

    const rows = sortedByZone.map((driver) => ([
      sanitize(driver.unit?.zone),
      sanitize(driver.cpdoId),
      sanitize(driver.firstName),
      sanitize(driver.middleName),
      sanitize(driver.lastName),
      sanitize(driver.extensionName),
      sanitize(getFullName(driver)),
      sanitize(driver.driverType),
      sanitize(driver.licenseNo),
      sanitize(driver.licenseExpiryDate),
      sanitize(driver.contactNo),
      sanitize(formatAddress(driver)),
      sanitize(getFullName(driver.operator)),
      sanitize(driver.operator?.barangay),
      sanitize(driver.operator?.cityMunicipality),
      sanitize(driver.unit?.bodyNo),
      sanitize(driver.unit?.plateNo),
      sanitize(driver.unit?.vehicleType),
      sanitize(driver.unit?.ltfrbMchCaseNo),
      sanitize(driver.unit?.colorCode),
      sanitize(driver.unit?.makeType),
      sanitize(driver.unit?.motorNo),
      sanitize(driver.unit?.chassisNo),
      sanitize(driver.unit?.yearModel),
      sanitize(driver.createdAt ? new Date(driver.createdAt).toLocaleString('en-PH') : ''),
      sanitize(driver.updatedAt ? new Date(driver.updatedAt).toLocaleString('en-PH') : ''),
    ]));

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Drivers');

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
      let fileName = 'drivers';
      if (!zoneFilter.includes('all') && zoneFilter.length > 0) {
        const zonesStr = zoneFilter.map(z => z.toLowerCase().replace(/\s+/g, '-')).join('-');
        fileName = `${zonesStr}-${fileName}`;
      }
      if (query.trim()) fileName += '-filtered';
      fileName += `-${timestamp}.xlsx`;

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName.toLowerCase().replace(/\s+/g, '-');
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('Drivers exported to Excel successfully.');
    } catch (err) {
      toast.error('Failed to export drivers to Excel.');
    }
  };

  return (
    <div className="drivers-page animate-fade-in">
      <div className="drivers-header">
        <div>
          <h1>Drivers Directory</h1>
          <p>View, sort, and inspect all saved PUV driver profiles.</p>
        </div>
        <div className="drivers-header-actions">
          <button className="btn-secondary export-btn" type="button" onClick={handleExportExcel}>
            <FileSpreadsheet size={18} />
            Export Excel
          </button>
          <button className="btn-primary" type="button" onClick={() => navigate('/drivers/new')}>
            <Plus size={18} />
            Add Driver
          </button>
        </div>
      </div>

      <div className="glass-panel driver-filters">
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: '2.5rem' }}
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
        <div style={{ position: 'relative', maxWidth: '200px' }}>
          <button
            ref={zoneButtonRef}
            type="button"
            className="input-field"
            style={{ textAlign: 'left', cursor: 'pointer', maxWidth: '200px' }}
            onClick={handleZoneButtonClick}
          >
            {zoneFilter.includes('all') ? 'All Zones' : zoneFilter.join(', ')}
          </button>
        </div>
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
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img 
                          src={driver.photoUrl || '/default.jpg'}
                          alt={getFullName(driver)} 
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-color)', cursor: 'pointer' }} 
                          onClick={(e) => { e.stopPropagation(); setModalImageUrl(driver.photoUrl || '/default.jpg'); setImageModalOpen(true); }}
                        />
                        {getFullName(driver)}
                      </div>
                    </td>
                    <td>{driver.unit?.zone || 'No Zone'}</td>
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
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setModalImageUrl(editImageFile ? URL.createObjectURL(editImageFile) : selectedDriver.photoUrl); setImageModalOpen(true); }}
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
                    <label>Extension Name (Jr., Sr., III)</label>
                    <input name="extensionName" className="input-field" value={editForm.driver.extensionName} onChange={handleEditChange('driver')} />
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
                    <label>Civil Status</label>
                    <select name="civilStatus" className="input-field" value={editForm.driver.civilStatus} onChange={handleEditChange('driver')}>
                      <option value="">Select Civil Status...</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Operator</label>
                    <select name="operator" className="input-field" value={editForm.driver.operator} onChange={(e) => {
                      const opId = e.target.value;
                      const op = operators.find(o => o._id === opId);
                      const fallbackUnit = op?.units?.[0]?._id || '';
                      setEditForm(prev => ({ ...prev, driver: { ...prev.driver, operator: opId, unit: fallbackUnit } }));
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
                    <label>Birthplace</label>
                    <input name="birthplace" className="input-field" value={editForm.driver.birthplace} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Age {editForm.driver.birthYear ? <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>(auto-computed)</span> : ''}</label>
                    <input
                      name="age" type="number" className="input-field" value={editForm.driver.age}
                      onChange={handleEditChange('driver')}
                      readOnly={!!(editForm.driver.birthMonth && editForm.driver.birthYear)}
                      style={editForm.driver.birthMonth && editForm.driver.birthYear ? { opacity: 0.7, background: 'var(--surface-bg)' } : {}}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Birth Month</label>
                    <select name="birthMonth" className="input-field" value={editForm.driver.birthMonth} onChange={handleEditChange('driver')}>
                      <option value="">-- Month --</option>
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Birth Date (Day)</label>
                    <input name="birthDate" type="number" min="1" max="31" className="input-field" value={editForm.driver.birthDate} onChange={handleEditChange('driver')} />
                  </div>
                  <div className="edit-form-group">
                    <label>Birth Year</label>
                    <input name="birthYear" type="number" min="1900" max="2100" className="input-field" value={editForm.driver.birthYear} onChange={handleEditChange('driver')} />
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
                <div className="details-photo-wrap">
                  <img 
                    src={selectedDriver.photoUrl || '/default.jpg'}
                    alt={getFullName(selectedDriver)} 
                    className="details-photo" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => { setModalImageUrl(selectedDriver.photoUrl || '/default.jpg'); setImageModalOpen(true); }}
                  />
                </div>
                <div><span>CPDO ID:</span><strong>{selectedDriver.cpdoId}</strong></div>
                <div><span>Name:</span><strong>{getFullName(selectedDriver)}</strong></div>
                <div><span>License:</span><strong>{selectedDriver.licenseNo}</strong></div>
                <div><span>License Expiry:</span><strong>{formatDateDisplay(selectedDriver.licenseExpiryDate)}</strong></div>
                <div><span>Civil Status:</span><strong>{selectedDriver.civilStatus || '-'}</strong></div>
                <div><span>Body No:</span><strong>{selectedDriver.unit?.bodyNo || '-'}</strong></div>
                <div><span>Plate No:</span><strong>{selectedDriver.unit?.plateNo || '-'}</strong></div>
                <div><span>Operator:</span><strong>{getFullName(selectedDriver.operator)}</strong></div>
                <div><span>Operator Area:</span><strong>{selectedDriver.operator?.barangay || '-'}, {selectedDriver.operator?.cityMunicipality || '-'}</strong></div>
                <div><span>Birthplace:</span><strong>{selectedDriver.birthplace || '-'}</strong></div>
                <div><span>Birthdate:</span><strong>{getFormattedBirthdate(selectedDriver)}</strong></div>
                <div><span>Age:</span><strong>{computeAge(selectedDriver.birthMonth, selectedDriver.birthDate, selectedDriver.birthYear) || '-'}</strong></div>
                <div><span>Contact:</span><strong>{selectedDriver.contactNo || '-'}</strong></div>
                <div className="details-full"><span>Driver Address:</span><strong>{formatAddress(selectedDriver)}</strong></div>
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

export default DriversList;
