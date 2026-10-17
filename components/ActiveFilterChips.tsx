'use client';

import React from 'react';

export interface FilterChipItem {
  id: string;
  label: string;
  value: string;
  onClear: () => void;
}

interface ActiveFilterChipsProps {
  chips: FilterChipItem[];
  onClearAll: () => void;
  className?: string;
}

export default function ActiveFilterChips({ chips, onClearAll, className = '' }: ActiveFilterChipsProps) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className={`d-flex flex-wrap align-items-center gap-1 py-1 mb-2 ${className}`}>
      <span className="text-muted fw-bold small me-1" style={{ fontSize: '0.75rem' }}>
        <i className="fas fa-filter fa-xs me-1 text-primary"></i>Đang lọc:
      </span>
      {chips.map((chip) => (
        <span key={chip.id} className="filter-chip">
          <span className="text-muted">{chip.label}:</span>
          <strong>{chip.value}</strong>
          <span
            className="filter-chip-remove"
            onClick={chip.onClear}
            title={`Bỏ lọc ${chip.label}`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                chip.onClear();
              }
            }}
          >
            &times;
          </span>
        </span>
      ))}
      <button
        type="button"
        className="btn btn-link btn-sm text-danger text-decoration-none p-0 ms-1 fw-medium"
        style={{ fontSize: '0.75rem' }}
        onClick={onClearAll}
      >
        <i className="fas fa-trash-alt fa-xs me-1"></i>Xóa tất cả
      </button>
    </div>
  );
}
