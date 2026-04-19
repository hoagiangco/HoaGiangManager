'use client';

import React from 'react';

const Loading = ({ fullPage = false, message = 'Đang tải dữ liệu...' }: { fullPage?: boolean, message?: string }) => {
  const content = (
    <div className="d-flex flex-column align-items-center justify-content-center py-5">
      <div className="loading-spinner-wrapper mb-3">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-core">
            <i className="fas fa-sync-alt fa-spin text-primary"></i>
        </div>
      </div>
      <p className="text-muted fw-medium animate-pulse">{message}</p>
      
      <style jsx>{`
        .loading-spinner-wrapper {
          position: relative;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .spinner-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 4px solid transparent;
          border-top-color: #0d6efd;
          border-radius: 50%;
          animation: spin 1.5s cubic-bezier(0.5, 0, 0.5, 1) infinite;
        }
        
        .spinner-ring:nth-child(2) {
          width: 80%;
          height: 80%;
          border-top-color: #6610f2;
          animation-delay: 0.1s;
        }
        
        .spinner-ring:nth-child(3) {
          width: 60%;
          height: 60%;
          border-top-color: #0dcaf0;
          animation-delay: 0.2s;
        }
        
        .spinner-core {
          z-index: 10;
          font-size: 1.5rem;
          background: white;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
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
