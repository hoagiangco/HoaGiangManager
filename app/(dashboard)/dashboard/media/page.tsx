'use client';

import React from 'react';
import FileManager from '@/components/FileManager';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function MediaLibraryPage() {
  return (
    <div className="container-fluid py-4 h-100 d-flex flex-column" style={{ minHeight: 'calc(100vh - 60px)' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1"><i className="fas fa-photo-video text-primary me-2"></i>Thư viện Media</h4>
          <p className="text-muted mb-0 small">
            Quản lý tập trung hình ảnh, tài liệu và file đính kèm. 
            <strong> Mẹo:</strong> Có thể kéo thả file hoặc nhấn <kbd>Ctrl</kbd> + <kbd>V</kbd> để upload nhanh ảnh từ bộ nhớ tạm!
          </p>
        </div>
      </div>

      <div className="flex-grow-1 rounded shadow-sm border overflow-hidden" style={{ minHeight: '600px', backgroundColor: '#fff' }}>
        <ErrorBoundary>
          <FileManager 
            isOpen={true} 
            embedded={true}
            mode="all"
            multiSelect={true}
            onClose={() => {}} // Embedded mode doesn't need to close
          />
        </ErrorBoundary>
      </div>
    </div>
  );
}
