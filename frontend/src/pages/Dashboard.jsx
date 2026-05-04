import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, AlertTriangle, ShieldCheck, Bike, Truck, Bus, Upload } from 'lucide-react';
import ExcelJS from 'exceljs';
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

const Dashboard = () => {
  const [drivers, setDrivers] = useState([]);
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
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [importing, setImporting] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const [importType, setImportType] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const [driversRes, summaryRes] = await Promise.all([
          axios.get('http://localhost:5000/api/drivers'),
          axios.get('http://localhost:5000/api/drivers/meta/summary'),
        ]);
        setDrivers(driversRes.data);
        setSummary(summaryRes.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };

    fetchDrivers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowImportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleImportSelection = (type) => {
    setShowImportMenu(false);
    setImportType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const processOperatorImport = async (worksheet) => {
    const operatorMap = new Map();
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const firstName = row.getCell(1).text?.trim();
      const lastName = row.getCell(3).text?.trim();
      if (!firstName || !lastName) return;

      const key = `${firstName}-${lastName}`.toLowerCase();
      
      if (!operatorMap.has(key)) {
        operatorMap.set(key, {
          operator: {
            firstName,
            middleName: row.getCell(2).text?.trim() || '',
            lastName,
            civilStatus: row.getCell(4).text?.trim() || 'Single',
            birthdate: row.getCell(5).text?.trim() || '',
            birthplace: row.getCell(6).text?.trim() || '',
            age: row.getCell(7).value ? Number(row.getCell(7).value) : undefined,
            addressNo: row.getCell(8).text?.trim() || '',
            street: row.getCell(9).text?.trim() || '',
            purok: row.getCell(10).text?.trim() || '',
            barangay: row.getCell(11).text?.trim() || '',
            cityMunicipality: row.getCell(12).text?.trim() || '',
            contactNo: row.getCell(13).text?.trim() || '',
            operatorType: row.getCell(14).text?.trim() || 'FOR HIRE',
          },
          units: []
        });
      }
      
      const bodyNo = row.getCell(16).text?.trim();
      if (bodyNo) {
        const vehicleType = row.getCell(15).text?.trim() || 'Tricycle';
        const unit = {
          vehicleType,
          bodyNo,
          makeType: row.getCell(17).text?.trim() || '',
          chassisNo: row.getCell(18).text?.trim() || '',
          motorNo: row.getCell(19).text?.trim() || '',
          plateNo: row.getCell(20).text?.trim() || '',
          yearModel: row.getCell(21).text?.trim() || '',
          ltfrbMchCaseNo: row.getCell(22).text?.trim() || '',
          zone: '',
          colorCode: ''
        };
        
        const firstChar = bodyNo.charAt(0);
        if (vehicleType === 'Tricycle') {
          if (bodyNo.startsWith('BB')) {
            unit.zone = 'BB';
          } else if (firstChar >= '1' && firstChar <= '9') {
            unit.zone = `Zone ${firstChar}`;
          }
        }
        
        const colorOpts = getColorOptions(bodyNo, vehicleType);
        if (colorOpts.length > 0) {
          unit.colorCode = colorOpts[0]; // Auto pick first available color code
        }
        
        operatorMap.get(key).units.push(unit);
      }
    });

    const promises = Array.from(operatorMap.values()).map(data => 
      axios.post('http://localhost:5000/api/operators', data)
    );
    
    await Promise.all(promises);
    alert('Import successful! Refreshing data...');
    window.location.reload();
  };

  const processMasterImport = async (worksheet) => {
    const operatorMap = new Map();
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const opFirstName = row.getCell(4).text?.trim();
      const opLastName = row.getCell(3).text?.trim();
      if (!opFirstName || !opLastName) return;

      const key = `${opFirstName}-${opLastName}`.toLowerCase();
      
      if (!operatorMap.has(key)) {
        operatorMap.set(key, {
          operator: {
            firstName: opFirstName,
            middleName: row.getCell(5).text?.trim() || '',
            lastName: opLastName,
            civilStatus: row.getCell(6).text?.trim() || 'Single',
            age: row.getCell(7).value ? Number(row.getCell(7).value) : undefined,
            addressNo: row.getCell(8).text?.trim() || '',
            street: row.getCell(9).text?.trim() || '',
            purok: row.getCell(10).text?.trim() || '',
            barangay: row.getCell(11).text?.trim() || '',
            cityMunicipality: row.getCell(12).text?.trim() || '',
            contactNo: row.getCell(13).text?.trim() || '',
          },
          units: []
        });
      }
      
      const bodyNo = row.getCell(2).text?.trim();
      if (bodyNo) {
        const vehicleType = row.getCell(1).text?.trim() || 'Tricycle';
        const unit = {
          vehicleType,
          bodyNo,
          ltfrbMchCaseNo: row.getCell(14).text?.trim() || '',
          colorCode: row.getCell(15).text?.trim() || '',
          makeType: row.getCell(16).text?.trim() || '',
          chassisNo: row.getCell(17).text?.trim() || '',
          motorNo: row.getCell(18).text?.trim() || '',
          plateNo: row.getCell(19).text?.trim() || '',
          yearModel: row.getCell(20).text?.trim() || '',
          zone: '',
          driver: null
        };
        
        // Auto-fill Zone
        const firstChar = bodyNo.charAt(0);
        if (vehicleType === 'Tricycle') {
          if (bodyNo.startsWith('BB')) {
            unit.zone = 'BB';
          } else if (firstChar >= '1' && firstChar <= '9') {
            unit.zone = `Zone ${firstChar}`;
          }
        }
        
        // Auto-fill Color Code if blank
        if (!unit.colorCode) {
          const colorOpts = getColorOptions(bodyNo, vehicleType);
          if (colorOpts.length > 0) {
            unit.colorCode = colorOpts[0];
          }
        }

        // Check for Driver in this row
        const drFirstName = row.getCell(26).text?.trim();
        const drLastName = row.getCell(25).text?.trim();
        if (drFirstName && drLastName) {
          unit.driver = {
            cpdoId: row.getCell(21).text?.trim() || '',
            licenseNo: row.getCell(22).text?.trim() || '',
            licenseExpiryDate: row.getCell(23).text?.trim() || '',
            licenseRestrictions: row.getCell(24).text?.trim() || '',
            lastName: drLastName,
            firstName: drFirstName,
            middleName: row.getCell(27).text?.trim() || '',
            civilStatus: row.getCell(28).text?.trim() || 'Single',
            age: row.getCell(29).value ? Number(row.getCell(29).value) : undefined,
            addressNo: row.getCell(30).text?.trim() || '',
            street: row.getCell(31).text?.trim() || '',
            purok: row.getCell(32).text?.trim() || '',
            barangay: row.getCell(33).text?.trim() || '',
            cityMunicipality: row.getCell(34).text?.trim() || '',
            contactNo: row.getCell(35).text?.trim() || '',
            birthMonth: row.getCell(36).text?.trim() || '',
            birthDate: row.getCell(37).text?.trim() || '',
            birthYear: row.getCell(38).text?.trim() || '',
            driverType: vehicleType,
            status: 'Active'
          };
        }

        // Check for Conductor in this row
        const cdFirstName = row.getCell(40).text?.trim();
        const cdLastName = row.getCell(39).text?.trim();
        if (cdFirstName && cdLastName) {
          unit.conductor = {
            lastName: cdLastName,
            firstName: cdFirstName,
            middleName: row.getCell(41).text?.trim() || '',
            gender: 'Male', 
            civilStatus: row.getCell(42).text?.trim() || 'Single',
            age: row.getCell(43).value ? Number(row.getCell(43).value) : undefined,
            addressNo: row.getCell(44).text?.trim() || '',
            street: row.getCell(45).text?.trim() || '',
            purok: row.getCell(46).text?.trim() || '',
            barangay: row.getCell(47).text?.trim() || '',
            cityMunicipality: row.getCell(48).text?.trim() || '',
            contactNo: row.getCell(49).text?.trim() || '',
            status: 'Active'
          };
        }
        
        operatorMap.get(key).units.push(unit);
      }
    });

    const promises = Array.from(operatorMap.values()).map(data => 
      axios.post('http://localhost:5000/api/operators', data)
    );
    
    await Promise.all(promises);
    alert('Master Import successful! All records have been created.');
    window.location.reload();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      
      // ExcelJS browser version only reliably supports XLSX
      if (!file.name.toLowerCase().endsWith('.xlsx')) {
        throw new Error('Please save your file as an "Excel Workbook (.xlsx)" in Excel before importing. CSV format is not supported in the browser.');
      }
      
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.worksheets[0] || workbook.getWorksheet(1);
      if (!worksheet) throw new Error('No worksheet found in file.');

      if (importType === 'Master') {
        await processMasterImport(worksheet);
      } else if (importType === 'Operator') {
        await processOperatorImport(worksheet);
      } else {
        alert(`${importType} import logic not fully implemented yet.`);
      }
    } catch (err) {
      console.error('Import Error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Unknown error occurred.';
      alert(`Import Failed: ${errorMessage}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const recentDrivers = useMemo(() => drivers.slice(0, 5), [drivers]);

  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Overview</h1>
          <p>Real-time monitoring of PUV operators, vehicles, and drivers.</p>
        </div>
        
        <div className="dashboard-actions" style={{ position: 'relative' }} ref={menuRef}>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button className="btn-primary" type="button" onClick={() => setShowImportMenu(!showImportMenu)} disabled={importing}>
            <Upload size={18} />
            {importing ? 'Importing...' : 'Import Data'}
          </button>
          
          {showImportMenu && (
            <div className="import-dropdown glass-panel" style={{ 
              position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', 
              padding: '0.5rem', zIndex: 50, display: 'flex', flexDirection: 'column', gap: '0.25rem',
              minWidth: '180px'
            }}>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'var(--accent-color)', color: 'white', fontWeight: 'bold' }} onClick={() => handleImportSelection('Master')}>Master Import (All-in-1)</button>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }} onClick={() => handleImportSelection('Operator')}>Operator</button>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }} onClick={() => handleImportSelection('Unit')}>Unit</button>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }} onClick={() => handleImportSelection('Driver')}>Driver</button>
              <button className="btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', border: 'none', background: 'transparent' }} onClick={() => handleImportSelection('Conductor')}>Conductor</button>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon">
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Registered Drivers</h3>
            <p>{summary.drivers}</p>
          </div>
        </div>
        
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.15)'}}>
            <ShieldCheck size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Operators</h3>
            <p>{summary.operators}</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: 'var(--warning)', backgroundColor: 'rgba(245, 158, 11, 0.15)'}}>
            <AlertTriangle size={24} />
          </div>
          <div className="stat-details">
            <h3>Total PUV Units</h3>
            <p>{summary.vehicles}</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{color: 'var(--accent-color)', backgroundColor: 'rgba(59, 130, 246, 0.15)'}}>
            <Users size={24} />
          </div>
          <div className="stat-details">
            <h3>Total Conductors</h3>
            <p>{summary.conductors || 0}</p>
          </div>
        </div>
      </div>

      <div className="stats-categories-grid">
        <div className="category-stat-card glass-panel" onClick={() => navigate('/drivers?type=Tricycle')}>
          <div className="category-info">
            <span className="category-label"><Bike size={18} /> Tricycle</span>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
              <span className="category-value" style={{ fontSize: '1.2rem' }}>{summary.tricycleDrivers} Drivers</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{summary.tricycleUnits} Units</span>
            </div>
          </div>
          <div className="category-action">View Directory →</div>
        </div>
        
        <div className="category-stat-card glass-panel" onClick={() => navigate('/drivers?type=Jeepney')}>
          <div className="category-info">
            <span className="category-label"><Truck size={18} /> Jeepney</span>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
              <span className="category-value" style={{ fontSize: '1.2rem' }}>{summary.jeepneyDrivers} Drivers</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{summary.jeepneyUnits} Units</span>
            </div>
          </div>
          <div className="category-action">View Directory →</div>
        </div>

        <div className="category-stat-card glass-panel" onClick={() => navigate('/drivers?type=Mini%20Bus')}>
          <div className="category-info">
            <span className="category-label"><Bus size={18} /> Mini Bus</span>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem' }}>
              <span className="category-value" style={{ fontSize: '1.2rem' }}>{summary.minibusDrivers} Drv.</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--warning)' }}>{summary.minibusUnits} Units</span>
              <span className="category-value" style={{ fontSize: '1.2rem', color: 'var(--accent-color)' }}>{summary.conductors} Cond.</span>
            </div>
          </div>
          <div className="category-action">View Directory →</div>
        </div>
      </div>

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
                  {driver.photoUrl ? (
                    <img src={driver.photoUrl} alt={`${driver.firstName} ${driver.lastName}`} className="driver-thumb" />
                  ) : (
                    <div className="driver-thumb-placeholder">
                      {(driver.firstName?.[0] || '').toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="recent-center">
                  <h3>{driver.firstName} {driver.lastName}</h3>
                  <p>{driver.licenseNo} | Body #{driver.unit?.bodyNo || '-'} | Plate {driver.unit?.plateNo || '-'}</p>
                </div>
                <span className="status-chip">{driver.status || 'Active'}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
