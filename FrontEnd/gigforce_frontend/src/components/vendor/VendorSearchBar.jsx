import React from 'react';

function VendorSearchBar({ placeholder, value, onChange }) {
  return (
    <div className="position-relative" style={{ maxWidth: '360px' }}>
      <span className="position-absolute start-0 top-50 translate-middle-y ps-3 text-muted">🔍</span>
      <input
        type="text"
        className="form-control ps-5 py-2"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        style={{ borderRadius: '0.5rem', fontSize: '0.9rem' }}
      />
    </div>
  );
}

export default VendorSearchBar;
