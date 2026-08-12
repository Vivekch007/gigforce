import React from 'react';

function FinanceTable({ headers, children }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0 table-mobile-scaled">
        <thead className="table-light">
          <tr>
            {headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}

export default FinanceTable;
