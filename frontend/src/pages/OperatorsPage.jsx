import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Plus, X, Bike, Truck, Bus, FileSpreadsheet } from 'lucide-react';
import ExcelJS from 'exceljs';
import { useConfirm } from '../context/ConfirmContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatAddress } from '../utils/formatUtils';
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
    if (bn.startsWith('J01')) return ['YELLOW'];
    if (bn.startsWith('J02')) return ['ORANGE'];
    if (bn.startsWith('J03')) return ['RED'];
    if (bn.startsWith('J04')) return ['YELLOW GREEN'];
    if (bn.startsWith('J05')) return ['CREAM'];
    if (bn.startsWith('J06')) return ['BROWN'];
    if (bn.startsWith('J07')) return ['GREEN W/WHITE TOP'];
    if (bn.startsWith('J08')) return ['DARKBLUE', 'DARKBLUE W/ YELLOW TOP'];
    if (bn.startsWith('J09')) return ['SKYBLUE', 'SKYBLUE W/ WHITE TOP'];
    if (bn.startsWith('J10') || bn.startsWith('J11')) return ['YELLOW W/RED TOP'];
    if (bn.startsWith('J12') || bn.startsWith('J13')) return ['SKYBLUE W/GOLD TOP'];
  } else if (vehicleType === 'Mini Bus') {
    if (bn.startsWith('OB') || bn.startsWith('O-B')) return ['DIRTY WHITE WITH GREEN STRIPES'];
    if (bn.startsWith('OZ') || bn.startsWith('O-Z')) return ['WHITE WITH BLUE STRIPES'];
  }
  return [];
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

const sanitize = (value) => String(value ?? '').replace(/\r?\n|\r/g, ' ').trim();

const formatBirthdate = (person) => {
  if (!person || !person.birthMonth || !person.birthDate || !person.birthYear) return '-';
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthIndex = months.findIndex(m => m.toLowerCase() === person.birthMonth.toLowerCase());
  if (monthIndex === -1) return '-';
  return `${months[monthIndex]} ${person.birthDate}, ${person.birthYear}`;
};

const formatPersonAddress = (person) => {
  if (!person) return '-';
  const parts = [person.addressNo, person.street, person.purok, person.barangay, person.cityMunicipality];
  return parts.filter(Boolean).join(' ') || '-';
};


const OperatorsPage = () => {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const toast = useToast();
  const { user } = useAuth();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState(['all']);
  const [zoneDropdownOpen, setZoneDropdownOpen] = useState(false);
  const [zoneDropdownPosition, setZoneDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const zoneButtonRef = useRef(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editImageFile, setEditImageFile] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [editForm, setEditForm] = useState({
    lastName: '', firstName: '', middleName: '', extensionName: '', civilStatus: '', age: '',
    addressNo: '', street: '', purok: '', barangay: '', cityMunicipality: '',
    contactNo: '', operatorType: 'FOR HIRE'
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
        const res = await axios.get('/api/operators');
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
    const res = await axios.get('/api/operators');
    setOperators(res.data);
    if (!keepSelected) {
      setSelectedOperatorId(res.data[0]?._id || '');
      return;
    }
    if (!res.data.some((operator) => operator._id === selectedOperatorId)) {
      setSelectedOperatorId(res.data[0]?._id || '');
    }
  };

  const zoneOptions = useMemo(() => {
    const dynamicZones = new Set();
    operators.forEach((op) => {
      (op.units || []).forEach((unit) => {
        if (unit.zone) dynamicZones.add(unit.zone);
      });
    });
    const predefined = [
      'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7', 'Zone 8', 'Zone 9',
      'BB',
      'J01', 'J02', 'J03', 'J04', 'J05', 'J06', 'J07', 'J08', 'J09', 'J10', 'J11', 'J12', 'J13',
      'OB', 'OZ'
    ];
    predefined.forEach((z) => dynamicZones.add(z));
    return [...dynamicZones].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [operators]);

  const filteredOperators = useMemo(() => {
    const query = search.trim().toLowerCase();
    return operators.filter((operator) => {
      const fullName = getFullName(operator).toLowerCase();
      const matchesQuery = !query || fullName.includes(query);
      const matchesZone = zoneFilter.includes('all') || (operator.units || []).some((unit) => zoneFilter.includes(unit.zone));
      return matchesQuery && matchesZone;
    });
  }, [operators, search, zoneFilter]);

  const selectedOperator = useMemo(
    () => filteredOperators.find((operator) => operator._id === selectedOperatorId) || null,
    [filteredOperators, selectedOperatorId],
  );

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
        await axios.put(`/api/units/${editingUnitId}`, newUnitData);
      } else {
        await axios.post(`/api/operators/${selectedOperatorId}/units`, newUnitData);
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
      extensionName: selectedOperator.extensionName || '',
      civilStatus: selectedOperator.civilStatus || 'Single',
      age: selectedOperator.age || '',
      addressNo: selectedOperator.addressNo || '',
      street: selectedOperator.street || '',
      purok: selectedOperator.purok || '',
      barangay: selectedOperator.barangay || '',
      cityMunicipality: selectedOperator.cityMunicipality || '',
      contactNo: selectedOperator.contactNo || '',
      operatorType: selectedOperator.operatorType || 'FOR HIRE',
    });
    setEditImageFile(null);
    setIsEditing(true);
    setActionError('');
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;

    // Fields that should only contain letters and spaces
    const letterOnlyFields = ['firstName', 'lastName', 'middleName', 'extensionName', 'barangay', 'cityMunicipality', 'civilStatus'];
    if (letterOnlyFields.includes(name)) {
      finalValue = value.replace(/[^a-zA-Z\s]/g, '');
    }

    // Fields that should only contain numbers
    if (name === 'contactNo') {
      finalValue = value.replace(/\D/g, '');
    }

    const uppercaseFields = ['firstName', 'lastName', 'middleName', 'extensionName', 'barangay', 'cityMunicipality', 'street', 'purok'];
    if (uppercaseFields.includes(name)) {
      finalValue = finalValue.toUpperCase();
    }

    setEditForm(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleUpdateOperator = async (e) => {
    e.preventDefault();
    if (!selectedOperatorId) return;
    if (!await confirm('Are you sure you want to save changes to this operator profile?')) return;
    setAddingUnit(true);
    setActionError('');
    try {
      const payload = new FormData();
      payload.append('operator', JSON.stringify(editForm));
      if (editImageFile) {
        payload.append('operatorImage', editImageFile);
      }

      const res = await axios.put(`/api/operators/${selectedOperatorId}`, payload);
      setOperators(prev => prev.map(op => op._id === selectedOperatorId ? { ...op, ...res.data } : op));
      setEditImageFile(null);
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
      await axios.delete(`/api/operators/${selectedOperatorId}`);
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
    const dataToExport = filteredOperators;
    if (dataToExport.length === 0) {
      toast.error('No operators available to export.');
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Operators');

      worksheet.columns = [
        { header: 'Operator Full Name', key: 'name', width: 30 },
        { header: 'Operator Last Name', key: 'lastName', width: 15 },
        { header: 'Operator First Name', key: 'firstName', width: 15 },
        { header: 'Operator Middle Name', key: 'middleName', width: 15 },
        { header: 'Operator Extension', key: 'extensionName', width: 10 },
        { header: 'Classification', key: 'type', width: 15 },
        { header: 'Operator Address', key: 'address', width: 40 },
        { header: 'Operator Contact', key: 'contact', width: 15 },
        { header: 'Unit Body No', key: 'unitBodyNo', width: 12 },
        { header: 'Unit Plate No', key: 'unitPlateNo', width: 12 },
        { header: 'Vehicle Type', key: 'vehicleType', width: 12 },
        { header: 'Zone', key: 'zone', width: 10 },
        { header: 'Color Code', key: 'colorCode', width: 15 },
        { header: 'Make/Type', key: 'makeType', width: 15 },
        { header: 'Motor No', key: 'motorNo', width: 15 },
        { header: 'Chassis No', key: 'chassisNo', width: 15 },
        { header: 'Year Model', key: 'yearModel', width: 12 },
        { header: 'LTFRB Case No', key: 'ltfrbMchCaseNo', width: 15 },
        { header: 'Driver Full Name', key: 'driverName', width: 25 },
        { header: 'Driver CPDO ID', key: 'driverCpdoId', width: 12 },
        { header: 'Driver License No', key: 'driverLicense', width: 15 },
        { header: 'Driver License Expiry', key: 'driverLicenseExpiry', width: 15 },
        { header: 'Driver Type', key: 'driverType', width: 12 },
        { header: 'Driver Status', key: 'driverStatus', width: 12 },
        { header: 'Driver Civil Status', key: 'driverCivilStatus', width: 12 },
        { header: 'Driver Age', key: 'driverAge', width: 8 },
        { header: 'Driver Birthdate', key: 'driverBirthdate', width: 15 },
        { header: 'Driver Birthplace', key: 'driverBirthplace', width: 20 },
        { header: 'Driver Address', key: 'driverAddress', width: 40 },
        { header: 'Driver Contact', key: 'driverContact', width: 15 },
        { header: 'Conductor Full Name', key: 'conductorName', width: 25 },
        { header: 'Conductor Status', key: 'conductorStatus', width: 12 },
        { header: 'Conductor Civil Status', key: 'conductorCivilStatus', width: 12 },
        { header: 'Conductor Gender', key: 'conductorGender', width: 10 },
        { header: 'Conductor Age', key: 'conductorAge', width: 8 },
        { header: 'Conductor Birthdate', key: 'conductorBirthdate', width: 15 },
        { header: 'Conductor Birthplace', key: 'conductorBirthplace', width: 20 },
        { header: 'Conductor Address', key: 'conductorAddress', width: 40 },
        { header: 'Conductor Contact', key: 'conductorContact', width: 15 },
        { header: 'Conductor Emergency Name', key: 'conductorEmergencyName', width: 25 },
        { header: 'Conductor Emergency Contact', key: 'conductorEmergencyContact', width: 15 },
        { header: 'Conductor Emergency Address', key: 'conductorEmergencyAddress', width: 40 },
      ];

      dataToExport.forEach(op => {
        const units = op.units || [];
        const drivers = op.drivers || [];
        const conductors = op.conductors || [];
        
        if (units.length === 0) {
          // Add operator row even if no units
          worksheet.addRow({
            name: getFullName(op),
            lastName: op.lastName,
            firstName: op.firstName,
            middleName: op.middleName,
            extensionName: op.extensionName || '',
            type: op.operatorType,
            address: formatAddress(op),
            contact: op.contactNo,
            unitBodyNo: '-',
            unitPlateNo: '-',
            vehicleType: '-',
            zone: '-',
            colorCode: '-',
            makeType: '-',
            motorNo: '-',
            chassisNo: '-',
            yearModel: '-',
            ltfrbMchCaseNo: '-',
            driverName: '-',
            driverCpdoId: '-',
            driverLicense: '-',
            driverLicenseExpiry: '-',
            driverType: '-',
            driverStatus: '-',
            driverCivilStatus: '-',
            driverAge: '-',
            driverBirthdate: '-',
            driverBirthplace: '-',
            driverAddress: '-',
            driverContact: '-',
            conductorName: '-',
            conductorStatus: '-',
            conductorCivilStatus: '-',
            conductorGender: '-',
            conductorAge: '-',
            conductorBirthdate: '-',
            conductorBirthplace: '-',
            conductorAddress: '-',
            conductorContact: '-',
            conductorEmergencyName: '-',
            conductorEmergencyContact: '-',
            conductorEmergencyAddress: '-',
          });
        } else {
          // Add a row for each unit with its assigned driver and conductor
          units.forEach(unit => {
            // Find driver assigned to this unit
            const assignedDriver = drivers.find(d => d.unit && String(d.unit._id) === String(unit._id));
            // Find conductor assigned to this unit
            const assignedConductor = conductors.find(c => c.unit && String(c.unit._id) === String(unit._id));
            
            worksheet.addRow({
              name: getFullName(op),
              lastName: op.lastName,
              firstName: op.firstName,
              middleName: op.middleName,
              extensionName: op.extensionName || '',
              type: op.operatorType,
              address: formatAddress(op),
              contact: op.contactNo,
              unitBodyNo: unit.bodyNo || '-',
              unitPlateNo: unit.plateNo || '-',
              vehicleType: unit.vehicleType || '-',
              zone: unit.zone || '-',
              colorCode: unit.colorCode || '-',
              makeType: unit.makeType || '-',
              motorNo: unit.motorNo || '-',
              chassisNo: unit.chassisNo || '-',
              yearModel: unit.yearModel || '-',
              ltfrbMchCaseNo: unit.ltfrbMchCaseNo || '-',
              driverName: assignedDriver ? getFullName(assignedDriver) : '-',
              driverCpdoId: assignedDriver?.cpdoId || '-',
              driverLicense: assignedDriver?.licenseNo || '-',
              driverLicenseExpiry: assignedDriver?.licenseExpiryDate || '-',
              driverType: assignedDriver?.driverType || '-',
              driverStatus: assignedDriver?.status || '-',
              driverCivilStatus: assignedDriver?.civilStatus || '-',
              driverAge: assignedDriver?.age || '-',
              driverBirthdate: assignedDriver ? formatBirthdate(assignedDriver) : '-',
              driverBirthplace: assignedDriver?.birthplace || '-',
              driverAddress: assignedDriver ? formatPersonAddress(assignedDriver) : '-',
              driverContact: assignedDriver?.contactNo || '-',
              conductorName: assignedConductor ? getFullName(assignedConductor) : '-',
              conductorStatus: assignedConductor?.status || '-',
              conductorCivilStatus: assignedConductor?.civilStatus || '-',
              conductorGender: assignedConductor?.gender || '-',
              conductorAge: assignedConductor?.age || '-',
              conductorBirthdate: assignedConductor ? formatBirthdate(assignedConductor) : '-',
              conductorBirthplace: assignedConductor?.birthPlace || '-',
              conductorAddress: assignedConductor ? formatPersonAddress(assignedConductor) : '-',
              conductorContact: assignedConductor?.contactNo || '-',
              conductorEmergencyName: assignedConductor?.emergencyContactName || '-',
              conductorEmergencyContact: assignedConductor?.emergencyContactNo || '-',
              conductorEmergencyAddress: assignedConductor?.emergencyContactAddress || '-',
            });
          });
        }
      });

      worksheet.getRow(1).height = 22;
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      const timestamp = new Date().toISOString().slice(0, 10);
      let fileName = 'operators';
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
          {user?.role !== 'otmps' && (
            <button className="btn-secondary export-btn" type="button" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />
              Export Excel
            </button>
          )}
          {user?.role !== 'otmps' && (
            <button className="btn-primary" type="button" onClick={() => navigate('/operators/new')}>
              <Plus size={18} />
              Add Operator
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel operators-search" style={{ display: 'flex', gap: '0.8rem' }}>
        <div style={{ position: 'relative', flexGrow: 1 }}>
          <input
            type="text"
            className="input-field"
            style={{ paddingRight: '2.5rem' }}
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
                    <div className="operator-card-header">
                      <img 
                        src={operator.photoUrl || '/default.jpg'}
                        alt={getFullName(operator)} 
                        className="operator-card-photo" 
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setModalImageUrl(operator.photoUrl || '/default.jpg'); setImageModalOpen(true); }}
                      />
                      <div className="operator-card-title">
                        {getFullName(operator)}
                        {operator.transferStatus && operator.transferStatus !== 'None' && (
                          <span className={`transfer-badge ${operator.transferStatus.toLowerCase()}`}>
                            {operator.transferStatus}
                          </span>
                        )}
                      </div>
                    </div>
                    <p>{operator.unitCount || 0} unit(s) | {operator.driverCount} driver(s) | {operator.conductorCount || 0} conductor(s)</p>
                    <span>Contact: {operator.contactNo || '-'}</span>
                    <span className="operator-card-address">{formatAddress(operator)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel operator-details">
            <div className="details-header">
              <h2>Operator Details</h2>
              {selectedOperator && !isEditing && user?.role !== 'otmps' && (
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
                <div className="edit-photo-group">
                  <label>Replace Operator Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="input-field"
                    onChange={(e) => setEditImageFile(e.target.files?.[0] || null)}
                  />
                  {(editImageFile || selectedOperator.photoUrl) && (
                    <img
                      src={editImageFile ? URL.createObjectURL(editImageFile) : selectedOperator.photoUrl}
                      alt="Operator preview"
                      className="details-photo"
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setModalImageUrl(editImageFile ? URL.createObjectURL(editImageFile) : selectedOperator.photoUrl); setImageModalOpen(true); }}
                    />
                  )}
                </div>
                <div className="form-grid-2col">
                  <div className="edit-form-group">
                    <label>First Name</label>
                    <input name="firstName" className="input-field" value={editForm.firstName} onChange={handleEditChange} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Middle Name</label>
                    <input name="middleName" className="input-field" value={editForm.middleName} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Last Name</label>
                    <input name="lastName" className="input-field" value={editForm.lastName} onChange={handleEditChange} required />
                  </div>
                  <div className="edit-form-group">
                    <label>Extension Name (Jr., Sr., III)</label>
                    <input name="extensionName" className="input-field" value={editForm.extensionName} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Age</label>
                    <input
                      name="age" type="number" className="input-field" value={editForm.age}
                      onChange={handleEditChange}
                    />
                  </div>
                  <div className="edit-form-group">
                    <label>Civil Status</label>
                    <select name="civilStatus" className="input-field" value={editForm.civilStatus} onChange={handleEditChange}>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Contact No.</label>
                    <input name="contactNo" className="input-field" value={editForm.contactNo} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Address No.</label>
                    <input name="addressNo" className="input-field" value={editForm.addressNo} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Street</label>
                    <input name="street" className="input-field" value={editForm.street} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Purok</label>
                    <input name="purok" className="input-field" value={editForm.purok} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>Barangay</label>
                    <input name="barangay" className="input-field" value={editForm.barangay} onChange={handleEditChange} />
                  </div>
                  <div className="edit-form-group">
                    <label>City/Municipality</label>
                    <input name="cityMunicipality" className="input-field" value={editForm.cityMunicipality} onChange={handleEditChange} />
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
                  <button type="button" className="btn-secondary" onClick={() => { setIsEditing(false); setEditImageFile(null); }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={addingUnit}>
                    {addingUnit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              <>
                {user?.role !== 'otmps' && (
                  <div className="operator-details-controls">
                    <button className="btn-primary" type="button" onClick={handleAddUnitClick} disabled={addingUnit}>
                      <Plus size={16} /> Add Unit
                    </button>
                  </div>
                )}
                <div className="operator-meta">
                  <div className="details-photo-wrap">
                    <img 
                      src={selectedOperator.photoUrl || '/default.jpg'}
                      alt={getFullName(selectedOperator)} 
                      className="details-photo" 
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setModalImageUrl(selectedOperator.photoUrl || '/default.jpg'); setImageModalOpen(true); }}
                    />
                  </div>
                  <div><span>Name:</span><strong>{getFullName(selectedOperator)}</strong></div>
                  <div><span>Classification:</span><strong>{selectedOperator.operatorType || '-'}</strong></div>
                  <div><span>Total Units:</span><strong>{selectedOperator.unitCount || 0}</strong></div>
                  <div><span>Age:</span><strong>{selectedOperator.age || '-'}</strong></div>
                  <div><span>Civil Status:</span><strong>{selectedOperator.civilStatus || '-'}</strong></div>
                  <div><span>Contact:</span><strong>{selectedOperator.contactNo || '-'}</strong></div>
                  <div><span>Address:</span><strong>{formatAddress(selectedOperator)}</strong></div>
                </div>

                <h3>Units ({selectedOperator.unitCount || 0})</h3>
                {selectedOperator.units?.length ? (
                  <div className="operator-drivers">
                    {selectedOperator.units.map((unit) => (
                      <div key={unit._id} className="operator-driver-item" style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong>Body #{unit.bodyNo}</strong>
                          {user?.role !== 'otmps' && (
                            <button className="btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEditUnitClick(unit)}>Edit</button>
                          )}
                        </div>
                        <p>Plate: {unit.plateNo || '-'}</p>
                        <p>
                          {unit.vehicleType === 'Tricycle' ? <Bike size={14} /> :
                            unit.vehicleType === 'Jeepney' ? <Truck size={14} /> :
                              <Bus size={14} />}
                          {' '}{unit.vehicleType} | {unit.zone ? `Zone: ${unit.zone}` : 'No Zone'}{unit.vehicleType !== 'Tricycle' ? ` | LTFRB: ${unit.ltfrbMchCaseNo || 'None'}` : ''}
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
                        <strong>{getFullName(driver)}</strong>
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
                        <strong>{getFullName(conductor)}</strong>
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
                        else if (bn.startsWith('J0') || /^J1[0-3]/.test(bn)) updated.vehicleType = 'Jeepney';
                        else if (bn.startsWith('OB') || bn.startsWith('O-B') || bn.startsWith('OZ') || bn.startsWith('O-Z')) updated.vehicleType = 'Mini Bus';

                        const vehicleType = updated.vehicleType || newUnitData.vehicleType;
                        const firstChar = val.charAt(0);
                        if (vehicleType === 'Tricycle') {
                          if (val.startsWith('BB')) {
                            updated.zone = 'BB';
                          } else if (firstChar >= '1' && firstChar <= '9') {
                            updated.zone = `Zone ${firstChar}`;
                          }
                        } else if (vehicleType === 'Jeepney') {
                          const match = val.match(/^(J0[1-9]|J1[0-3])/i);
                          if (match) updated.zone = match[1].toUpperCase();
                        } else if (vehicleType === 'Mini Bus') {
                          if (val.toUpperCase().startsWith('OB') || val.toUpperCase().startsWith('O-B')) updated.zone = 'OB';
                          else if (val.toUpperCase().startsWith('OZ') || val.toUpperCase().startsWith('O-Z')) updated.zone = 'OZ';
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
                        } else if (val === 'Jeepney') {
                          const match = bodyNo.match(/^(J0[1-9]|J1[0-3])/i);
                          if (match) updated.zone = match[1].toUpperCase();
                        } else if (val === 'Mini Bus') {
                          if (bodyNo.toUpperCase().startsWith('OB') || bodyNo.toUpperCase().startsWith('O-B')) updated.zone = 'OB';
                          else if (bodyNo.toUpperCase().startsWith('OZ') || bodyNo.toUpperCase().startsWith('O-Z')) updated.zone = 'OZ';
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
                  <div className="form-group">
                    <label>Zone / Route</label>
                    <input type="text" className="input-field" value={newUnitData.zone} onChange={(e) => setNewUnitData({ ...newUnitData, zone: e.target.value.toUpperCase() })} />
                  </div>
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

export default OperatorsPage;
