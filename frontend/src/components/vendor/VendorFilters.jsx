import React from 'react';
import { Form } from 'react-bootstrap';

function VendorFilters({ label, value, onChange, options = [] }) {
  return (
    <div>
      {label && <Form.Label className="enterprise-form-label" style={{ fontSize: '12px' }}>{label}</Form.Label>}
      <Form.Select
        size="sm"
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
