'use client';

import React from 'react';

const Loading = ({ fullPage = false, message = 'Đang tải dữ liệu...' }: { fullPage?: boolean, message?: string }) => {
  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div className="loading-spinner-container mb-3">
        <div className="spinner-core">
          <i className="fas fa-sync-alt fa-spin text-primary"></i>
        </div>
      </div>
      <p className="text-muted fw-medium message-text">{message}</p>
      
      <style jsx>{`
        .loading-spinner-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .spinner-core {
          font-size: 1.75rem;
          background: white;
          border-radius: 50%;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 1px solid rgba(0,0,0,0.05);
        }
        
        .message-text {
          font-size: 0.95rem;
          letter-spacing: 0.01em;
        }
      `}</style>
    </div>
  );

  if (fullPage) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
        {content}
      </div>
    );
  }

  return content;
};

export default Loading;
