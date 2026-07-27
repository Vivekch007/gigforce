import React from 'react';
import { Form } from 'react-bootstrap';

function VendorFilters({ label, value, onChange, options = [] }) {
  return (
    <div className="d-flex align-items-center gap-2">
      {label && <span className="small text-muted font-bold text-uppercase">{label}:</span>}
      <Form.Select
        value={value}
        onChange={onChange}
        style={{ width: '180px', borderRadius: '0.5rem', fontSize: '0.875rem' }}
      >
        {options.map((opt, i) => (
          <option key={i} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Form.Select>
    </div>
  );
}

export default VendorFilters;
