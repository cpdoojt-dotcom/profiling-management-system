import { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, AlertTriangle, ShieldCheck, Bike, Truck, Bus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
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

const getFullName = (person) => {
  if (!person) return '';
  return [person.firstName, person.middleName, person.lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
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
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
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

  const processMasterImport = async (rows) => {
    const operatorMap = new Map();
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
            birthdate: row[7] ? new Date(row[7]) : undefined,
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
        const vehicleType = String(row[0] || '').trim() || 'Tricycle';
        const unit = {
          vehicleType,
          bodyNo,
          ltfrbMchCaseNo: String(row[16] || '').trim(),
          colorCode: String(row[17] || '').trim(),
          makeType: String(row[18] || '').trim(),
          chassisNo: String(row[19] || '').trim(),
          motorNo: String(row[20] || '').trim(),
          plateNo: String(row[21] || '').trim(),
          yearModel: String(row[22] || '').trim(),
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
        const drFirstName = String(row[28] || '').trim();
        const drLastName = String(row[27] || '').trim();
        if (drFirstName && drLastName) {
          unit.driver = {
            cpdoId: String(row[23] || '').trim(),
            licenseNo: String(row[24] || '').trim(),
            licenseExpiryDate: String(row[25] || '').trim(),
            lastName: drLastName,
            firstName: drFirstName,
            middleName: String(row[29] || '').trim(),
            extensionName: String(row[30] || '').trim(),
            civilStatus: String(row[31] || '').trim() || 'Single',
            birthMonth: String(row[32] || '').trim(),
            birthDate: String(row[33] || '').trim(),
            birthYear: String(row[34] || '').trim(),
            birthplace: String(row[35] || '').trim(),
            age: row[36] ? Number(row[36]) : undefined,
            addressNo: String(row[37] || '').trim(),
            street: String(row[38] || '').trim(),
            purok: String(row[39] || '').trim(),
            barangay: String(row[40] || '').trim(),
            cityMunicipality: String(row[41] || '').trim(),
            contactNo: String(row[42] || '').trim(),
            driverType: vehicleType,
            status: 'Active'
          };
        }

        // Check for Conductor in this row
        const cdFirstName = String(row[44] || '').trim();
        const cdLastName = String(row[43] || '').trim();
        if (cdFirstName && cdLastName) {
          unit.conductor = {
            lastName: cdLastName,
            firstName: cdFirstName,
            middleName: String(row[45] || '').trim(),
            extensionName: String(row[46] || '').trim(),
            civilStatus: String(row[47] || '').trim() || 'Single',
            birthMonth: String(row[48] || '').trim(),
            birthDate: String(row[49] || '').trim(),
            birthYear: String(row[50] || '').trim(),
            birthPlace: String(row[51] || '').trim(),
            age: row[52] ? Number(row[52]) : undefined,
            addressNo: String(row[53] || '').trim(),
            street: String(row[54] || '').trim(),
            purok: String(row[55] || '').trim(),
            barangay: String(row[56] || '').trim(),
            cityMunicipality: String(row[57] || '').trim(),
            contactNo: String(row[58] || '').trim(),
            conductorType: vehicleType,
            status: 'Active'
          };
        }
        
        operatorMap.get(key).units.push(unit);
      }
    }

    const promises = Array.from(operatorMap.values()).map(data => 
      axios.post('http://localhost:5000/api/operators', data)
    );
    
    await Promise.all(promises);
    alert('Master Import successful! All records have been created.');
    window.location.reload();
  };

  const downloadTemplate = () => {
    const headers = [
      'Vehicle Category', 'Body No', 'Operator Last Name', 'Operator First Name', 'Operator Middle Name', 'Operator Extension Name',
      'Operator Civil Status', 'Operator Birthdate', 'Operator Birthplace', 'Operator Age', 'Operator Address No', 'Operator Street', 'Operator Purok', 
      'Operator Barangay', 'Operator City/Municipality', 'Operator Contact No', 'LTFRB/MCH Case No', 'Color Code', 
      'Make/Type', 'Chassis No', 'Motor No', 'Plate No', 'Year Model', 'Driver CPDO ID', 'Driver License No', 
      'Driver License Expiry Date', 'SKIPPED_COLUMN', 'Driver Last Name', 'Driver First Name', 'Driver Middle Name', 'Driver Extension Name',
      'Driver Civil Status', 'Driver Birth Month', 'Driver Birth Date', 'Driver Birth Year', 'Driver Birthplace', 'Driver Age', 'Driver Address No', 'Driver Street', 'Driver Purok', 'Driver Barangay', 
      'Driver City/Municipality', 'Driver Contact No', 'Conductor Last Name', 'Conductor First Name', 'Conductor Middle Name', 'Conductor Extension Name', 'Conductor Civil Status', 
      'Conductor Birth Month', 'Conductor Birth Date', 'Conductor Birth Year', 'Conductor Birthplace', 'Conductor Age', 
      'Conductor Address No', 'Conductor Street', 'Conductor Purok', 'Conductor Barangay', 'Conductor City/Municipality', 
      'Conductor Contact No'
    ];
    
    const sampleRow = [
      'Jeepney', 'J01-101', 'DELA CRUZ', 'JUAN', 'SANTOS', 'JR', 'Married', '1980-01-01', 'CITY NAME', '45', '123', 'MAHARLIKA HWY', 'PUROK 1', 
      'BARANGAY 1', 'CITY NAME', '09123456789', '2024-ABC-123', 'YELLOW', 'ISUZU', 'CH-123', 'MO-123', 'NQR-123', '2022',
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
          alert(`Error parsing file: ${innerErr.message}`);
          setImporting(false);
        }
      };
      reader.onerror = () => {
        alert('Error reading file.');
        setImporting(false);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error('Import Error:', err);
      alert(`Import Failed: ${err.message}`);
      setImporting(false);
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
                  <h3>{getFullName(driver)}</h3>
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
