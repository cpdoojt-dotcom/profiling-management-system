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
            lastName: opLastName,
            civilStatus: String(row[5] || '').trim() || 'Single',
            age: row[6] ? Number(row[6]) : undefined,
            addressNo: String(row[7] || '').trim(),
            street: String(row[8] || '').trim(),
            purok: String(row[9] || '').trim(),
            barangay: String(row[10] || '').trim(),
            cityMunicipality: String(row[11] || '').trim(),
            contactNo: String(row[12] || '').trim(),
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
          ltfrbMchCaseNo: String(row[13] || '').trim(),
          colorCode: String(row[14] || '').trim(),
          makeType: String(row[15] || '').trim(),
          chassisNo: String(row[16] || '').trim(),
          motorNo: String(row[17] || '').trim(),
          plateNo: String(row[18] || '').trim(),
          yearModel: String(row[19] || '').trim(),
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
        }
        
        // Auto-fill Color Code if blank
        if (!unit.colorCode) {
          const colorOpts = getColorOptions(bodyNo, vehicleType);
          if (colorOpts.length > 0) {
            unit.colorCode = colorOpts[0];
          }
        }

        // Check for Driver in this row
        const drFirstName = String(row[25] || '').trim();
        const drLastName = String(row[24] || '').trim();
        if (drFirstName && drLastName) {
          unit.driver = {
            cpdoId: String(row[20] || '').trim(),
            licenseNo: String(row[21] || '').trim(),
            licenseExpiryDate: String(row[22] || '').trim(),
            lastName: drLastName,
            firstName: drFirstName,
            middleName: String(row[26] || '').trim(),
            civilStatus: String(row[27] || '').trim() || 'Single',
            age: row[28] ? Number(row[28]) : undefined,
            addressNo: String(row[29] || '').trim(),
            street: String(row[30] || '').trim(),
            purok: String(row[31] || '').trim(),
            barangay: String(row[32] || '').trim(),
            cityMunicipality: String(row[33] || '').trim(),
            contactNo: String(row[34] || '').trim(),
            birthMonth: String(row[35] || '').trim(),
            birthDate: String(row[36] || '').trim(),
            birthYear: String(row[37] || '').trim(),
            driverType: vehicleType,
            status: 'Active'
          };
        }

        // Check for Conductor in this row
        const cdFirstName = String(row[39] || '').trim();
        const cdLastName = String(row[38] || '').trim();
        if (cdFirstName && cdLastName) {
          unit.conductor = {
            lastName: cdLastName,
            firstName: cdFirstName,
            middleName: String(row[40] || '').trim(),
            civilStatus: String(row[41] || '').trim() || 'Single',
            age: row[42] ? Number(row[42]) : undefined,
            addressNo: String(row[43] || '').trim(),
            street: String(row[44] || '').trim(),
            purok: String(row[45] || '').trim(),
            barangay: String(row[46] || '').trim(),
            cityMunicipality: String(row[47] || '').trim(),
            contactNo: String(row[48] || '').trim(),
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
        
        <div className="dashboard-actions">
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
