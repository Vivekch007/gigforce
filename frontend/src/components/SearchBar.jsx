import React from 'react';

function SearchBar({ placeholder = 'Search...', value = '', onChange, className = '' }) {
  return (
    <div className={`topbar-search-box ${className}`} style={{ width: '100%' }}>
      <i className="bi bi-search"></i>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}

export default SearchBar;
