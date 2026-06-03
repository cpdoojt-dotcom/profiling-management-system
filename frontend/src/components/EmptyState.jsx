import React from 'react';
import { Search, FileText, Users, AlertCircle } from 'lucide-react';
import './EmptyState.css';

const EmptyState = ({ type = 'default', message, actionLabel, onAction }) => {
  const getIcon = () => {
    switch (type) {
      case 'search':
        return <Search size={48} />;
      case 'no-data':
        return <FileText size={48} />;
      case 'no-users':
        return <Users size={48} />;
      case 'error':
        return <AlertCircle size={48} />;
      default:
        return <FileText size={48} />;
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'search':
        return 'No results found';
      case 'no-data':
        return 'No data available';
      case 'no-users':
        return 'No records found';
      case 'error':
        return 'Something went wrong';
      default:
        return 'No data available';
    }
  };

  const getSubtext = () => {
    switch (type) {
      case 'search':
        return 'Try adjusting your search or filter criteria';
      case 'no-data':
        return 'Get started by adding your first record';
      case 'no-users':
        return 'There are no profiles to display yet';
      case 'error':
        return 'Please try again later or contact support';
      default:
        return '';
    }
  };

  return (
    <div className="empty-state" role="status" aria-live="polite">
      <div className="empty-state-icon">{getIcon()}</div>
      <h3 className="empty-state-title">{message || getDefaultMessage()}</h3>
      {getSubtext() && <p className="empty-state-subtext">{getSubtext()}</p>}
      {actionLabel && onAction && (
        <button className="btn-primary empty-state-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
