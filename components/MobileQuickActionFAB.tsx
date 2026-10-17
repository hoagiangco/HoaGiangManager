'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

export default function MobileQuickActionFAB({
  onQuickReport,
}: {
  onQuickReport?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="mobile-fab-container d-md-none"
      style={{
        position: 'fixed',
        bottom: '22px',
        right: '20px',
        zIndex: 1060,
      }}
    >
      {/* Expanded Menu Actions */}
      {isOpen && (
        <div
          className="d-flex flex-column gap-2 mb-2 align-items-end"
          style={{
            transformOrigin: 'bottom right',
            transition: 'all 0.2s ease',
          }}
        >
          <Link
            href="/dashboard/damage-reports"
            className="btn btn-danger btn-sm shadow d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold"
            onClick={() => {
              setIsOpen(false);
              if (onQuickReport) onQuickReport();
            }}
            style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}
          >
            <span>Báo sự cố mới</span>
            <i className="fas fa-exclamation-triangle"></i>
          </Link>
          <Link
            href="/dashboard/spare-parts"
            className="btn btn-warning btn-sm shadow text-dark d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold"
            onClick={() => setIsOpen(false)}
            style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}
          >
            <span>Kho vật tư</span>
            <i className="fas fa-boxes"></i>
          </Link>
          <Link
            href="/dashboard/weekly-schedule"
            className="btn btn-info btn-sm shadow text-white d-flex align-items-center gap-2 rounded-pill px-3 py-2 fw-semibold"
            onClick={() => setIsOpen(false)}
            style={{ fontSize: '0.825rem', whiteSpace: 'nowrap' }}
          >
            <span>Lịch công tác tuần</span>
            <i className="fas fa-calendar-week"></i>
          </Link>
        </div>
      )}

      {/* Main Trigger Button */}
      <button
        type="button"
        className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
        style={{
          width: '52px',
          height: '52px',
          fontSize: '1.25rem',
          boxShadow: '0 6px 16px rgba(13, 110, 253, 0.45)',
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(45deg)' : 'none',
        }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Thao tác nhanh trên di động"
        title="Thao tác nhanh"
      >
        <i className="fas fa-plus"></i>
      </button>
    </div>
  );
}
