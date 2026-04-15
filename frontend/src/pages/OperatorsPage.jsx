import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus } from 'lucide-react';
import './OperatorsPage.css';

const OperatorsPage = () => {
  const navigate = useNavigate();
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOperatorId, setSelectedOperatorId] = useState('');

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/operators');
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

  const filteredOperators = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return operators;
    return operators.filter((operator) => {
      const fullName = `${operator.firstName} ${operator.lastName}`.toLowerCase();
      return (
        fullName.includes(query)
        || String(operator.bodyNo || '').toLowerCase().includes(query)
        || String(operator.plateNo || '').toLowerCase().includes(query)
      );
    });
  }, [operators, search]);

  const selectedOperator = useMemo(
    () => filteredOperators.find((operator) => operator._id === selectedOperatorId) || null,
    [filteredOperators, selectedOperatorId],
  );

  return (
    <div className="operators-page animate-fade-in">
      <div className="operators-header">
        <div>
          <h1>Operators</h1>
          <p>Manage operators and all drivers assigned under each operator.</p>
        </div>
        <button className="btn-primary" type="button" onClick={() => navigate('/drivers/new')}>
          <Plus size={18} />
          Add Driver/Operator
        </button>
      </div>

      <div className="glass-panel operators-search">
        <input
          type="text"
          className="input-field"
          placeholder="Search by operator name, body no, or plate no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                    <div className="operator-card-title">
                      {operator.firstName} {operator.lastName}
                    </div>
                    <p>Body #{operator.bodyNo} | Plate {operator.plateNo || '-'}</p>
                    <span>{operator.driverCount} driver(s)</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="glass-panel operator-details">
            <h2>Operator Details</h2>
            {!selectedOperator ? (
              <p className="operators-state">Select an operator to view details and assigned drivers.</p>
            ) : (
              <>
                <div className="operator-meta">
                  <div><span>Name:</span><strong>{selectedOperator.firstName} {selectedOperator.lastName}</strong></div>
                  <div><span>Body No:</span><strong>{selectedOperator.bodyNo || '-'}</strong></div>
                  <div><span>Plate No:</span><strong>{selectedOperator.plateNo || '-'}</strong></div>
                  <div><span>Contact:</span><strong>{selectedOperator.contactNo || '-'}</strong></div>
                  <div><span>Area:</span><strong>{selectedOperator.barangay || '-'}, {selectedOperator.cityMunicipality || '-'}</strong></div>
                  <div><span>Make/Type:</span><strong>{selectedOperator.makeType || '-'}</strong></div>
                </div>

                <h3>Assigned Drivers ({selectedOperator.driverCount})</h3>
                {selectedOperator.drivers.length === 0 ? (
                  <p className="operators-state">No drivers assigned yet.</p>
                ) : (
                  <div className="operator-drivers">
                    {selectedOperator.drivers.map((driver) => (
                      <div key={driver._id} className="operator-driver-item">
                        <strong>{driver.firstName} {driver.lastName}</strong>
                        <p>CPDO ID: {driver.cpdoId} | License: {driver.licenseNo}</p>
                        <p>Status: {driver.status || 'Active'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorsPage;
