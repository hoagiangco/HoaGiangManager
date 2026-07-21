'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: '' };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo: errorInfo.componentStack || '' });
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: '#f8f9fa',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: '#fff',
              borderRadius: '12px',
              padding: '32px 24px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
            <h4 style={{ color: '#dc3545', marginBottom: '8px' }}>Đã xảy ra lỗi</h4>
            <p style={{ color: '#6c757d', marginBottom: '8px', fontSize: '0.95rem' }}>
              Trang gặp sự cố không mong muốn. Vui lòng thử tải lại.
            </p>
            {this.state.error && (
              <details style={{ marginBottom: '20px', textAlign: 'left' }}>
                <summary
                  style={{ cursor: 'pointer', color: '#6c757d', fontSize: '0.8rem', marginBottom: '8px' }}
                >
                  Chi tiết lỗi
                </summary>
                <pre
                  style={{
                    background: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: '#dc3545',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {this.state.error.message}
                  {this.state.errorInfo && '\n\nComponent Stack:\n' + this.state.errorInfo}
                </pre>
              </details>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#0d6efd',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🔄 Tải lại trang
              </button>
              <button
                onClick={this.handleGoHome}
                style={{
                  background: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                🏠 Về trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
