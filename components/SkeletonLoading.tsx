'use client';

import React from 'react';

export function SkeletonBox({
  width = '100%',
  height = '1rem',
  className = '',
  style = {},
}: {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`skeleton-box ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
    />
  );
}

export function SkeletonTable({
  rows = 6,
  cols = 6,
  className = '',
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={`p-3 ${className}`}>
      {/* Table Header Placeholder */}
      <div className="d-flex align-items-center gap-3 py-2 border-bottom mb-2 bg-light px-2 rounded-2">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBox
            key={`th-${i}`}
            height="1.2rem"
            width={i === 0 ? '40px' : i === 1 ? '30%' : `${70 / (cols - 1)}%`}
          />
        ))}
      </div>
      {/* Table Rows Placeholder */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`tr-${rowIdx}`}
          className="d-flex align-items-center gap-3 py-2 border-bottom px-2"
          style={{ opacity: 1 - rowIdx * 0.1 }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonBox
              key={`td-${rowIdx}-${colIdx}`}
              height="1rem"
              width={
                colIdx === 0
                  ? '30px'
                  : colIdx === 1
                  ? `${Math.floor(25 + ((rowIdx * 7) % 20))}%`
                  : `${Math.floor(50 / (cols - 1))}%`
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="row g-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="col-12 col-md-6 col-lg-4">
          <div className="card shadow-sm border p-3 rounded-3 h-100">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <SkeletonBox width="60%" height="1.1rem" />
              <SkeletonBox width="60px" height="1.2rem" style={{ borderRadius: '12px' }} />
            </div>
            <SkeletonBox width="90%" height="0.85rem" className="mb-2" />
            <SkeletonBox width="45%" height="0.85rem" className="mb-3" />
            <div className="d-flex justify-content-between pt-2 border-top">
              <SkeletonBox width="80px" height="0.8rem" />
              <SkeletonBox width="70px" height="0.8rem" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card shadow-sm border p-3 rounded-3 h-100">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <SkeletonBox width="50%" height="0.9rem" />
        <SkeletonBox width="32px" height="32px" style={{ borderRadius: '8px' }} />
      </div>
      <SkeletonBox width="40%" height="1.8rem" className="mb-1" />
      <SkeletonBox width="70%" height="0.75rem" />
    </div>
  );
}

export default SkeletonTable;
