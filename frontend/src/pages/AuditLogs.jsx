import { useEffect, useMemo, useState, useRef } from 'react';
import axios from 'axios';
import { Search, RefreshCw, Calendar } from 'lucide-react';
import './AuditLogs.css';

const MODULE_OPTIONS = ['All', 'Driver', 'Conductor', 'Unit', 'Operator'];

const formatDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    user: '',
    module: 'All',
  });

  const startDateRef = useRef(null);
  const endDateRef = useRef(null);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.user.trim()) params.set('user', filters.user.trim());
    if (filters.module && filters.module !== 'All') params.set('module', filters.module);
    params.set('page', String(pagination.page));
    params.set('limit', '20');
    return params.toString();
  }, [filters, pagination.page]);

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`/api/audit-logs?${queryParams}`);
      setLogs(res.data.data || []);
      setPagination((prev) => ({
        ...prev,
        totalPages: res.data.pagination?.totalPages || 1,
        total: res.data.pagination?.total || 0,
      }));
      if (selectedLog) {
        const latestSelected = (res.data.data || []).find((item) => item._id === selectedLog._id) || null;
        setSelectedLog(latestSelected);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [queryParams]);

  const handleFilterChange = (field, value) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const clearFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters({
      startDate: '',
      endDate: '',
      user: '',
      module: 'All',
    });
  };

  return (
    <div className="audit-logs-page animate-fade-in">
      <div className="audit-header">
        <h1>Audit Log Viewer</h1>
        <p>Human-readable timeline of who changed what and when.</p>
      </div>

      <div className="glass-panel audit-filters">
        <div className="filter-grid">
          <div className="form-group">
            <label htmlFor="startDate">Start Date</label>
            <div className="date-input-wrapper">
              <input
                ref={startDateRef}
                id="startDate"
                type="date"
                className="input-field"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
              <button
                type="button"
                className="calendar-icon-btn"
                onClick={() => startDateRef.current?.showPicker?.() || startDateRef.current?.click()}
              >
                <Calendar size={18} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="endDate">End Date</label>
            <div className="date-input-wrapper">
              <input
                ref={endDateRef}
                id="endDate"
                type="date"
                className="input-field"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
              <button
                type="button"
                className="calendar-icon-btn"
                onClick={() => endDateRef.current?.showPicker?.() || endDateRef.current?.click()}
              >
                <Calendar size={18} />
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="user">User Email</label>
            <input
              id="user"
              type="text"
              className="input-field"
              value={filters.user}
              onChange={(e) => handleFilterChange('user', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="module">Module</label>
            <select
              id="module"
              className="input-field"
              value={filters.module}
              onChange={(e) => handleFilterChange('module', e.target.value)}
            >
              {MODULE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="filter-actions">
          <button type="button" className="btn-secondary" onClick={clearFilters}>
            <RefreshCw size={16} />
            Reset
          </button>
          <button type="button" className="btn-primary" onClick={fetchLogs}>
            <Search size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && <p className="action-error">{error}</p>}

      <div className="audit-content">
        <div className="glass-panel audit-table-wrap">
          <div className="table-meta">
            <span>{loading ? 'Loading logs...' : `${pagination.total} records found`}</span>
          </div>
          <table className="audit-table">
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Module</th>
                <th>Action</th>
                <th>Summary</th>
              </tr>
            </thead>
            <tbody>
              {!loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No audit logs found for this filter.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log._id}
                    className={selectedLog?._id === log._id ? 'selected-row' : ''}
                    onClick={() => setSelectedLog(log)}
                  >
                    <td>{formatDateTime(log.createdAt)}</td>
                    <td>{log.actorEmail || 'system@local'}</td>
                    <td>{log.module}</td>
                    <td>{log.action}</td>
                    <td>{log.summary}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="pagination-bar">
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(prev.page - 1, 1) }))}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="btn-secondary"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPagination((prev) => ({
                  ...prev,
                  page: Math.min(prev.page + 1, prev.totalPages),
                }))
              }
            >
              Next
            </button>
          </div>
        </div>

        <div className="glass-panel audit-details">
          <h3>Log Details</h3>
          {!selectedLog ? (
            <p className="empty-details">Select a row to view field-by-field changes.</p>
          ) : (
            <>
              <div className="details-summary">
                <p><strong>Timestamp:</strong> {formatDateTime(selectedLog.createdAt)}</p>
                <p><strong>User:</strong> {selectedLog.actorEmail || 'system@local'}</p>
                <p><strong>Module:</strong> {selectedLog.module}</p>
                <p><strong>Action:</strong> {selectedLog.action}</p>
                <p><strong>Summary:</strong> {selectedLog.summary}</p>
              </div>
              <div className="changes-block">
                <h4>Field Changes</h4>
                {selectedLog.changes?.length ? (
                  <div className="changes-list">
                    {selectedLog.changes.map((change, index) => (
                      <div key={`${selectedLog._id}-${change.field}-${index}`} className="change-item">
                        <div className="change-field">{change.field}</div>
                        <div className="change-values">
                          <span className="change-before">{change.before || '(empty)'}</span>
                          <span className="change-arrow">→</span>
                          <span className="change-after">{change.after || '(empty)'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-details">No field-level changes captured for this action.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
