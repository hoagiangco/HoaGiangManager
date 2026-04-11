'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface Option {
  id: number;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '— Chưa xác định —',
  className = 'form-control',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.id === value);
  const displayLabel = selectedOption ? selectedOption.name : placeholder;

  const filteredOptions = options.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="position-relative flex-grow-1" style={{ minWidth: 0 }}>
      <div
        className={`${className} d-flex justify-content-between align-items-center`}
        style={{ cursor: 'pointer', backgroundColor: '#fff', userSelect: 'none' }}
        onClick={() => {
          setIsOpen(!isOpen);
          setSearch('');
        }}
      >
        <span className="text-truncate">{displayLabel}</span>
        <i
          className={`fas fa-chevron-${isOpen ? 'up' : 'down'} text-muted ms-2`}
          style={{ fontSize: '0.8em', flexShrink: 0 }}
        ></i>
      </div>

      {isOpen && (
        <div
          className="dropdown-menu show w-100 p-0 shadow border"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 9999,
            maxHeight: '280px',
            display: 'flex',
            flexDirection: 'column',
            marginTop: '2px',
          }}
        >
          <div className="p-2 border-bottom bg-light position-sticky top-0" style={{ zIndex: 1 }}>
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <i className="fas fa-search text-muted"></i>
              </span>
              <input
                ref={inputRef}
                type="text"
                className="form-control border-start-0"
                placeholder="Tìm kiếm vị trí..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-auto bg-white" style={{ flex: 1, maxHeight: '220px' }}>
            <div
              className={`dropdown-item py-2 ${value === 0 ? 'bg-primary text-white' : ''}`}
              style={{ cursor: 'pointer', fontWeight: value === 0 ? 'bold' : 'normal' }}
              onClick={() => {
                onChange(0);
                setIsOpen(false);
              }}
            >
              {placeholder}
            </div>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isActive = value === opt.id;
                return (
                  <div
                    key={opt.id}
                    className={`dropdown-item py-2 ${isActive ? 'bg-primary text-white' : ''}`}
                    style={{
                      cursor: 'pointer',
                      whiteSpace: 'normal',
                      borderBottom: '1px solid #f8f9fa',
                      fontWeight: isActive ? 'bold' : 'normal',
                    }}
                    onClick={() => {
                      onChange(opt.id);
                      setIsOpen(false);
                    }}
                  >
                    {opt.name}
                  </div>
                );
              })
            ) : (
              <div className="dropdown-item text-muted disabled py-2 text-center">
                Không tìm thấy kết quả
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
