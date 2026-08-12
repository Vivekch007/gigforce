import React from 'react';

function Table({ headers = [], children, className = '', responsive = true }) {
  const tableElement = (
    <table className={`enterprise-table table-mobile-scaled ${className}`}>
      {headers.length > 0 && (
        <thead>
          <tr>
            {headers.map((header, idx) => (
              <th key={idx}>{header}</th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {children}
      </tbody>
    </table>
  );

  if (responsive) {
    return (
      <div className="enterprise-table-container">
        <div className="table-responsive">
          {tableElement}
        </div>
      </div>
    );
  }

  return (
    <div className="enterprise-table-container">
      {tableElement}
    </div>
  );
}

export default Table;
