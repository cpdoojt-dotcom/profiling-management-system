import React from 'react';
import './SkeletonLoader.css';

const SkeletonLoader = ({ variant = 'text', width, height, count = 1, className = '' }) => {
  const skeletons = Array.from({ length: count }, (_, i) => (
    <div
      key={i}
      className={`skeleton skeleton-${variant} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  ));

  return <div className="skeleton-wrapper">{skeletons}</div>;
};

export const TableSkeleton = ({ rows = 5, columns = 3 }) => {
  return (
    <div className="skeleton-table" role="status" aria-label="Loading table data">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLoader key={i} variant="rect" height={32} />
        ))}
      </div>
      <div className="skeleton-table-body">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="skeleton-table-row">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonLoader key={colIndex} variant="text" height={24} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="skeleton-card" role="status" aria-label="Loading card data">
      <SkeletonLoader variant="circle" width={84} height={84} className="skeleton-card-avatar" />
      <SkeletonLoader variant="text" width="60%" height={20} />
      <SkeletonLoader variant="text" width="40%" height={16} />
      <SkeletonLoader variant="text" width="80%" height={16} />
    </div>
  );
};

export default SkeletonLoader;
