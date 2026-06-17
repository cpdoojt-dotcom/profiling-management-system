import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, AlertTriangle, ShieldCheck, Bike, Truck, Bus, Upload, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import trikeLogo from '../assets/trike.jpg';
import jeepLogo from '../assets/jeep.jpg';
import busLogo from '../assets/bus.png';
import './Dashboard.css';

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

const parseExcelDate = (val) => {
  if (!val) return '';
  const num = Number(val);
  if (!isNaN(num) && num > 0) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return trimmed;
  }
  
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  
  return String(val).trim();
};

const getFullName = (person) => {
  if (!person) return '';
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
};

const Dashboard = () => {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [operators, setOperators] = useState([]);
  const [conductors, setConductors] = useState([]);
  const [summary, setSummary] = useState({ 
    drivers: 0, 
    operators: 0, 
    vehicles: 0,
    conductors: 0,
    tricycleDrivers: 0,
    jeepneyDrivers: 0,
    minibusDrivers: 0,
    tricycleUnits: 0,
    jeepneyUnits: 0,
    minibusUnits: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchDriversData = async () => {
    try {
      const [driversRes, summaryRes, operatorsRes, conductorsRes] = await Promise.all([
        axios.get('/api/drivers'),
        axios.get('/api/drivers/meta/summary'),
        axios.get('/api/operators'),
        axios.get('/api/conductors'),
      ]);
      setDrivers(driversRes.data);
      setSummary(summaryRes.data);
      setOperators(operatorsRes.data);
      setConductors(conductorsRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDriversData();
  }, []);

  const processMasterImport = async (rows) => {
    const operatorMap = new Map();
    let unitCount = 0;
    let driverCount = 0;
    let conductorCount = 0;
    // Start from row index 1 to skip header
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 4) continue;

      const opFirstName = String(row[3] || '').trim();
      const opLastName = String(row[2] || '').trim();
      if (!opFirstName || !opLastName) continue;

      const key = `${opFirstName}-${opLastName}`.toLowerCase();
      
      if (!operatorMap.has(key)) {
        operatorMap.set(key, {
          operator: {
            firstName: opFirstName,
            middleName: String(row[4] || '').trim(),
            extensionName: String(row[5] || '').trim(),
            lastName: opLastName,
            civilStatus: String(row[6] || '').trim() || 'Single',
            birthdate: row[7] ? new Date(parseExcelDate(row[7])) : undefined,
            birthplace: String(row[8] || '').trim(),
            age: row[9] ? Number(row[9]) : undefined,
            addressNo: String(row[10] || '').trim(),
            street: String(row[11] || '').trim(),
            purok: String(row[12] || '').trim(),
            barangay: String(row[13] || '').trim(),
            cityMunicipality: String(row[14] || '').trim(),
            contactNo: String(row[15] || '').trim(),
            operatorType: 'FOR HIRE',
          },
          units: []
        });
      }
      
      const bodyNo = String(row[1] || '').trim();
      if (bodyNo) {
        unitCount++;
        const vehicleType = String(row[0] || '').trim() || 'Tricycle';
        const unit = {
          vehicleType,
          bodyNo,
          ltfrbMchCaseNo: String(row[16] || '').trim(),
          colorCode: '',
          makeType: String(row[17] || '').trim(),
          chassisNo: String(row[18] || '').trim(),
          motorNo: String(row[19] || '').trim(),
          plateNo: String(row[20] || '').trim(),
          yearModel: String(row[21] || '').trim(),
          zone: '',
          driver: null,
          conductor: null
        };
        
        // Auto-fill Zone
        const firstChar = bodyNo.charAt(0);
        if (vehicleType === 'Tricycle') {
          if (bodyNo.startsWith('BB')) {
            unit.zone = 'BB';
          } else if (firstChar >= '1' && firstChar <= '9') {
            unit.zone = `Zone ${firstChar}`;
          }
        } else if (vehicleType === 'Jeepney') {
          const match = bodyNo.match(/^(J0[1-9]|J1[0-3])/i);
          if (match) unit.zone = match[1].toUpperCase();
        } else if (vehicleType === 'Mini Bus') {
          const bnUpper = bodyNo.toUpperCase();
          if (bnUpper.startsWith('OB') || bnUpper.startsWith('O-B')) unit.zone = 'OB';
          else if (bnUpper.startsWith('OZ') || bnUpper.startsWith('O-Z')) unit.zone = 'OZ';
        }
        
        // Auto-fill Color Code if blank
        if (!unit.colorCode) {
          const colorOpts = getColorOptions(bodyNo, vehicleType);
          if (colorOpts.length > 0) {
            unit.colorCode = colorOpts[0];
          }
        }

        // Check for Driver in this row
        const drFirstName = String(row[26] || '').trim();
        const drLastName = String(row[25] || '').trim();
        if (drFirstName && drLastName) {
          driverCount++;
          unit.driver = {
            cpdoId: String(row[22] || '').trim(),
            licenseNo: String(row[23] || '').trim(),
            licenseExpiryDate: parseExcelDate(row[24]),
            lastName: drLastName,
            firstName: drFirstName,
            middleName: String(row[27] || '').trim(),
            extensionName: String(row[28] || '').trim(),
            civilStatus: String(row[29] || '').trim() || 'Single',
            birthMonth: String(row[30] || '').trim(),
            birthDate: row[31] ? Number(row[31]) : undefined,
            birthYear: row[32] ? Number(row[32]) : undefined,
            birthplace: String(row[33] || '').trim(),
            age: row[34] ? Number(row[34]) : undefined,
            addressNo: String(row[35] || '').trim(),
            street: String(row[36] || '').trim(),
            purok: String(row[37] || '').trim(),
            barangay: String(row[38] || '').trim(),
            cityMunicipality: String(row[39] || '').trim(),
            contactNo: String(row[40] || '').trim(),
            driverType: vehicleType,
            status: 'Active'
          };
        }

        // Check for Conductor in this row
        const cdFirstName = String(row[42] || '').trim();
        const cdLastName = String(row[41] || '').trim();
        if (cdFirstName && cdLastName) {
          conductorCount++;
          unit.conductor = {
            lastName: cdLastName,
            firstName: cdFirstName,
            middleName: String(row[43] || '').trim(),
            extensionName: String(row[44] || '').trim(),
            civilStatus: String(row[45] || '').trim() || 'Single',
            birthMonth: String(row[46] || '').trim(),
            birthDate: row[47] ? Number(row[47]) : undefined,
            birthYear: row[48] ? Number(row[48]) : undefined,
            birthPlace: String(row[49] || '').trim(),
            age: row[50] ? Number(row[50]) : undefined,
            addressNo: String(row[51] || '').trim(),
            street: String(row[52] || '').trim(),
            purok: String(row[53] || '').trim(),
            barangay: String(row[54] || '').trim(),
            cityMunicipality: String(row[55] || '').trim(),
            contactNo: String(row[56] || '').trim(),
            conductorType: vehicleType,
            status: 'Active'
          };
        }
        
        operatorMap.get(key).units.push(unit);
      }
    }

    const promises = Array.from(operatorMap.values()).map(data => 
      axios.post('/api/operators', data)
    );
    
    await Promise.all(promises);
    
    setImportSummary({
      rows: rows.length - 1,
      operators: operatorMap.size,
      units: unitCount,
      drivers: driverCount,
      conductors: conductorCount
    });
    setImporting(false);
    setShowSuccessModal(true);
    toast.success('Master Data Import successful!');
    
    fetchDriversData();
  };

  const downloadTemplate = () => {
    const headers = [
      'Vehicle Category', 'Body No', 'Operator Last Name', 'Operator First Name', 'Operator Middle Name', 'Operator Extension Name',
      'Operator Civil Status', 'Operator Birthdate', 'Operator Birthplace', 'Operator Age', 'Operator Address No', 'Operator Street', 'Operator Purok', 
      'Operator Barangay', 'Operator City/Municipality', 'Operator Contact No', 'LTFRB/MCH Case No', 
      'Make/Type', 'Chassis No', 'Motor No', 'Plate No', 'Year Model', 'Driver CPDO ID', 'Driver License No', 
      'Driver License Expiry Date', 'Driver Last Name', 'Driver First Name', 'Driver Middle Name', 'Driver Extension Name',
      'Driver Civil Status', 'Driver Birth Month', 'Driver Birth Date', 'Driver Birth Year', 'Driver Birthplace', 'Driver Age', 'Driver Address No', 'Driver Street', 'Driver Purok', 'Driver Barangay', 
      'Driver City/Municipality', 'Driver Contact No', 'Conductor Last Name', 'Conductor First Name', 'Conductor Middle Name', 'Conductor Extension Name', 'Conductor Civil Status', 
      'Conductor Birth Month', 'Conductor Birth Date', 'Conductor Birth Year', 'Conductor Birthplace', 'Conductor Age', 
      'Conductor Address No', 'Conductor Street', 'Conductor Purok', 'Conductor Barangay', 'Conductor City/Municipality', 
      'Conductor Contact No'
    ];
    
    const sampleRow = [
      'Jeepney', 'J01-101', 'DELA CRUZ', 'JUAN', 'SANTOS', 'JR', 'Married', '1980-01-01', 'CITY NAME', '45', '123', 'MAHARLIKA HWY', 'PUROK 1', 
      'BARANGAY 1', 'CITY NAME', '09123456789', '2024-ABC-123', 'ISUZU', 'CH-123', 'MO-123', 'NQR-123', '2022',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
    ];

    const csvContent = [headers, sampleRow].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "master_import_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          if (data.length < 2) throw new Error('File appears to be empty.');
          await processMasterImport(data);
        } catch (innerErr) {
          toast.error(`Error parsing file: ${innerErr.message}`);
          setImporting(false);
        }
      };
      reader.onerror = () => {
        toast.error('Error reading file.');
        setImporting(false);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error('Import Error:', err);
      toast.error(`Import Failed: ${err.message}`);
      setImporting(false);
    }
  };

  const recentDrivers = useMemo(() => drivers.slice(0, 5), [drivers]);
  const recentOperators = useMemo(() => operators.slice(0, 5), [operators]);
  const recentConductors = useMemo(() => conductors.slice(0, 5), [conductors]);

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Overview</h1>
          <p>Real-time monitoring of PUV operators, vehicles, and drivers.</p>
        </div>
        
        {user?.role !== 'otmps' && (
          <div className="dashboard-actions" style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              className="btn-secondary" 
              type="button" 
              onClick={downloadTemplate}
            >
              Download Template
            </button>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <button 
              className="btn-primary" 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={importing}
            >
              <Upload size={18} />
              {importing ? 'Importing...' : 'Import Data'}
            </button>
          </div>
        )}
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.15)'}}>
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Registered Drivers</h3>
            <p>{summary.drivers}</p>
          </div>
        </div>
        
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.15)'}}>
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Operators</h3>
            <p>{summary.operators}</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: '#a855f7', backgroundColor: 'rgba(168, 85, 247, 0.15)'}}>
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Conductors</h3>
            <p>{summary.conductors || 0}</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)'}}>
            <Bus size={24} />
          </div>
          <div className="stat-details">
            <h3>Total PUV Units</h3>
            <p>{summary.vehicles}</p>
          </div>
        </div>
      </div>

      <div className="stats-categories-grid">
        <div className="category-stat-card glass-panel" onClick={() => navigate('/drivers?type=Tricycle')}>
          <div className="category-info">
            <span className="category-label" style={{ fontSize: '1.1rem' }}><img src={trikeLogo} alt="Tricycle" style={{ width: '28px', height: '28px', marginRight: '0.5rem', background: 'transparent', mixBlendMode: 'screen' }} /> Tricycle</span>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
              <span className="category-value" style={{ fontSize: '1.2rem' }}>{summary.tricycleDrivers} Drivers</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{summary.tricycleUnits} Units</span>
            </div>
          </div>
          <div className="category-action">View Directory →</div>
        </div>
        
        <div className="category-stat-card glass-panel" onClick={() => navigate('/drivers?type=Jeepney')}>
          <div className="category-info">
            <span className="category-label" style={{ fontSize: '1.1rem' }}><img src={jeepLogo} alt="Jeepney" style={{ width: '28px', height: '28px', marginRight: '0.5rem', background: 'transparent', mixBlendMode: 'screen' }} /> Jeepney</span>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
              <span className="category-value" style={{ fontSize: '1.2rem' }}>{summary.jeepneyDrivers} Drivers</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{summary.jeepneyUnits} Units</span>
            </div>
          </div>
          <div className="category-action">View Directory →</div>
        </div>

        <div className="category-stat-card glass-panel" onClick={() => navigate('/conductors?type=Mini%20Bus')}>
          <div className="category-info">
            <span className="category-label" style={{ fontSize: '1.1rem' }}><img src={busLogo} alt="Mini Bus" style={{ width: '28px', height: '28px', marginRight: '0.5rem', background: 'transparent', mixBlendMode: 'screen' }} /> Mini Bus</span>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
              <span className="category-value" style={{ fontSize: '1.2rem' }}>{summary.minibusDrivers} Drv.</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{summary.minibusUnits} Units</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}>{summary.conductors} Cond.</span>
            </div>
          </div>
          <div className="category-action">View Directory →</div>
        </div>
      </div>

      <div className="recent-sections">
        <div className="recent-section glass-panel">
          <div className="recent-header">
            <h2>Recently Added Drivers</h2>
            <Link to="/drivers" className="drivers-link">View all</Link>
          </div>
          {loading ? (
            <div className="empty-state">
              <p>Loading latest drivers...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
            </div>
          ) : recentDrivers.length === 0 ? (
            <div className="empty-state">
              <p>No drivers added yet.</p>
            </div>
          ) : (
            <div className="recent-list">
              {recentDrivers.map((driver) => (
                <Link className="recent-item" key={driver._id} to={`/drivers?driverId=${driver._id}`}>
                  <div className="recent-left">
                    <img src={driver.photoUrl || '/default.jpg'} alt={`${driver.firstName} ${driver.lastName}`} className="driver-thumb" />
                  </div>
                  <div className="recent-center">
                    <h3>{getFullName(driver)}</h3>
                    <p>{driver.licenseNo} | Body #{driver.unit?.bodyNo || '-'} | Plate {driver.unit?.plateNo || '-'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="recent-section glass-panel">
          <div className="recent-header">
            <h2>Recently Added Operators</h2>
            <Link to="/operators" className="drivers-link">View all</Link>
          </div>
          {loading ? (
            <div className="empty-state">
              <p>Loading latest operators...</p>
            </div>
          ) : recentOperators.length === 0 ? (
            <div className="empty-state">
              <p>No operators added yet.</p>
            </div>
          ) : (
            <div className="recent-list">
              {recentOperators.map((operator) => (
                <Link className="recent-item" key={operator._id} to={`/operators`}>
                  <div className="recent-left">
                    <img src={operator.photoUrl || '/default.jpg'} alt={getFullName(operator)} className="driver-thumb" />
                  </div>
                  <div className="recent-center">
                    <h3>{getFullName(operator)}</h3>
                    <p>{operator.contactNo || '-'} | {operator.unitCount || 0} unit(s) | {operator.driverCount || 0} driver(s)</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="recent-section glass-panel">
          <div className="recent-header">
            <h2>Recently Added Conductors</h2>
            <Link to="/conductors" className="drivers-link">View all</Link>
          </div>
          {loading ? (
            <div className="empty-state">
              <p>Loading latest conductors...</p>
            </div>
          ) : recentConductors.length === 0 ? (
            <div className="empty-state">
              <p>No conductors added yet.</p>
            </div>
          ) : (
            <div className="recent-list">
              {recentConductors.map((conductor) => (
                <Link className="recent-item" key={conductor._id} to={`/conductors?conductorId=${conductor._id}`}>
                  <div className="recent-left">
                    <img src={conductor.photoUrl || '/default.jpg'} alt={`${conductor.firstName} ${conductor.lastName}`} className="driver-thumb" />
                  </div>
                  <div className="recent-center">
                    <h3>{getFullName(conductor)}</h3>
                    <p>Body #{conductor.unit?.bodyNo || '-'} | Plate {conductor.unit?.plateNo || '-'} | {conductor.status || 'Active'}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modern, premium glassmorphism importing overlay */}
      {importing && (
        <div className="import-loading-overlay">
          <div className="import-spinner"></div>
          <p>Processing Master CSV Data</p>
          <span>Uploading and building database profiles, please wait...</span>
        </div>
      )}

      {/* Modern, premium glassmorphism success modal */}
      {showSuccessModal && importSummary && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '450px', textAlign: 'center', padding: '2.5rem' }}>
            <div className="success-pulse-icon" style={{ margin: '0 auto 1.5rem auto' }}>
              <CheckCircle2 size={48} style={{ color: 'var(--success)' }} />
            </div>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: '#fff' }}>Import Completed!</h2>
            <p style={{ opacity: 0.7, marginBottom: '2rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
              All records from your CSV file have been successfully processed, validated, and saved to secure storage.
            </p>
                     <div className="import-stats-summary" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(4, 1fr)', 
              gap: '0.75rem', 
              marginBottom: '2.5rem',
              background: 'rgba(255, 255, 255, 0.03)',
              padding: '1.25rem 0.75rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Operators</span>
                <strong style={{ fontSize: '1.35rem', color: 'var(--accent-color)' }}>{importSummary.operators}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Units</span>
                <strong style={{ fontSize: '1.35rem', color: 'var(--success)' }}>{importSummary.units}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Drivers</span>
                <strong style={{ fontSize: '1.35rem', color: 'var(--warning)' }}>{importSummary.drivers}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', marginBottom: '0.25rem' }}>Conductors</span>
                <strong style={{ fontSize: '1.35rem', color: '#60a5fa' }}>{importSummary.conductors}</strong>
              </div>
            </div>
            
            <button 
              className="btn-primary" 
              style={{ 
                width: '120px', 
                margin: '0 auto', 
                display: 'block', 
                padding: '0.6rem 1.5rem', 
                fontSize: '0.95rem', 
                borderRadius: '8px' 
              }}
              onClick={() => setShowSuccessModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
