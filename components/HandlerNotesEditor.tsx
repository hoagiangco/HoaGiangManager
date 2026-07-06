'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TimelineEntry } from '@/types';

// Helper to parse timeline
export const parseTimeline = (value: string | undefined | null): TimelineEntry[] => {
  if (!value || value === '[]') return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      if (parsed.length === 0) return [];
      if (parsed.length > 0 && parsed[0].hasOwnProperty('timestamp')) {
        return parsed;
      }
    }
  } catch (e) {}
  return [{
    id: 'legacy-' + Math.random().toString(36).substring(2, 9),
    timestamp: new Date().toISOString(),
    author: 'Người xử lý',
    content: value || '',
    type: 'legacy'
  }];
};

export const getLatestNoteContent = (value: string | undefined | null): string => {
  const timeline = parseTimeline(value);
  const userTimeline = timeline.filter(e => e.type !== 'auto');
  if (userTimeline.length > 0) return userTimeline[userTimeline.length - 1].content || '';
  if (timeline.length > 0) return timeline[timeline.length - 1].content || '';
  return '';
};

interface HandlerNotesEditorProps {
  reportId: number;
  value: string;
  onChange: (value: string) => void | Promise<void>;
  onClick?: (e: React.MouseEvent) => void;
  isCard?: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
  isAdding: boolean;
  setIsAdding: (isAdding: boolean) => void;
  inline?: boolean;
}

const HandlerNotesEditor: React.FC<HandlerNotesEditorProps> = ({
  reportId,
  value,
  onChange,
  onClick,
  isCard = false,
  canEdit = true,
  isAdmin = false,
  isAdding,
  setIsAdding,
  inline = false
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const timeline = useMemo(() => parseTimeline(value), [value]);
  const userTimeline = useMemo(() => timeline.filter(e => e.type !== 'auto'), [timeline]);
  const latestNote = userTimeline.length > 0 ? userTimeline[userTimeline.length - 1] : null;

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleSave = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!newNote.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onChange(newNote.trim());
      setNewNote('');
      setIsAdding(false);
    } catch (error) {
      // Error handled by parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNewNote('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel(e as any);
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave(e as any);
    }
  };

  const formatDateLabel = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '';
    }
  };

  const modalRef = useRef<HTMLDivElement>(null);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const handleUpdateEntry = async (entryId: string) => {
    if (!editingContent.trim()) return;
    const updatedTimeline = timeline.map(entry => 
      entry.id === entryId ? { ...entry, content: editingContent.trim() } : entry
    );
    try {
      await onChange(JSON.stringify(updatedTimeline));
      setEditingEntryId(null);
      setEditingContent('');
    } catch (error) {
      // Error handled by parent
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;
    const updatedTimeline = timeline.filter(entry => entry.id !== entryId);
    try {
      await onChange(updatedTimeline.length > 0 ? JSON.stringify(updatedTimeline) : '');
    } catch (error) {
      // Error handled by parent
    }
  };

  // Robust click outside handling for the modal
  useEffect(() => {
    if (!isAdding) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    // Use a small timeout to avoid catching the same event that opened it
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdding]);

  return (
    <div className="d-flex flex-column" onClick={(e) => { e.stopPropagation(); if (onClick) onClick(e); }} style={{ width: '100%', position: 'relative' }}>
      
      {/* Inline History Display for Edit Modal */}
      {inline && timeline.length > 0 && (
        <div className="mb-2 p-2 border rounded bg-light bg-opacity-50" style={{ maxHeight: '200px', overflowY: 'auto' }}>
          <div className="small fw-bold text-muted mb-2 border-bottom pb-1 uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
             LỊCH SỬ GHI CHÚ ({timeline.length})
          </div>
          {timeline.map((entry, idx) => (
            <div key={entry.id || idx} className="mb-2 p-2 rounded border bg-white shadow-sm position-relative">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <span className="fw-bold" style={{ fontSize: '0.75rem', color: entry.type === 'auto' ? '#059669' : '#1e293b' }}>
                  {entry.type === 'auto' && <i className="fas fa-robot me-1 text-success"></i>}
                  {entry.author}
                </span>
                <div className="d-flex align-items-center gap-2">
                  {canEdit && entry.type !== 'auto' && (
                    <div className="d-flex gap-1 me-2">
                      <button 
                        type="button"
                        className="btn btn-link p-0 text-primary" 
                        style={{ fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingEntryId(entry.id);
                          setEditingContent(entry.content);
                        }}
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button 
                        type="button"
                        className="btn btn-link p-0 text-danger" 
                        style={{ fontSize: '0.7rem' }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDeleteEntry(entry.id);
                        }}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </div>
                  )}
                  <span className="text-muted" style={{ fontSize: '0.65rem' }}>
                    {formatDateLabel(entry.timestamp)}
                  </span>
                </div>
              </div>
              {editingEntryId === entry.id ? (
                <div className="mt-1">
                  <textarea 
                    className="form-control form-control-sm mb-2" 
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    style={{ fontSize: '0.8rem' }}
                    rows={3}
                  />
                    <div className="d-flex justify-content-end gap-2">
                      <button 
                        type="button"
                        className="btn btn-sm btn-primary py-0" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUpdateEntry(entry.id);
                        }}
                      >
                        Lưu
                      </button>
                      <button 
                        type="button"
                        className="btn btn-sm btn-light border py-0" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingEntryId(null);
                        }}
                      >
                        Hủy
                      </button>
                    </div>
                </div>
              ) : (
                <div className={entry.type === 'auto' ? 'text-success fst-italic' : 'text-dark'} style={{ fontSize: '0.8rem', whiteSpace: 'pre-wrap' }}>
                  {entry.content}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Default/Card Note Display */}
      {!inline && (
        <div 
          className="d-flex align-items-center justify-content-between p-1 rounded" 
          style={{ 
            minHeight: isCard ? '2.5rem' : '2rem', 
            backgroundColor: canEdit ? (isAdding ? '#eff6ff' : '#f8f9fa') : 'transparent', 
            border: canEdit ? (isAdding ? '1px solid #3b82f6' : '1px solid #e9ecef') : '1px solid transparent', 
            cursor: canEdit ? 'text' : 'default',
            transition: 'all 0.2s ease',
            boxShadow: isAdding ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none'
          }} 
          onClick={(e) => {
            if (canEdit && !isAdding) {
              e.stopPropagation();
              setIsAdding(true);
            } else if (isAdding) {
              // Prevent bubbling to document or parent if already adding
              e.stopPropagation();
            }
          }}
        >
          <div style={{ flex: 1 }}>
            {latestNote ? (
              <div style={{ fontSize: isCard ? '0.85rem' : '0.8rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                <span className="text-muted" style={{ fontSize: '0.7rem', marginRight: '4px' }}>
                  {formatDateLabel(latestNote.timestamp)}
                </span>
                <span className="text-dark" style={{ whiteSpace: 'pre-wrap' }}>
                  {latestNote.content}
                </span>
              </div>
            ) : (
              <span className="text-muted fst-italic" style={{ fontSize: '0.8rem' }}>Chưa có ghi chú</span>
            )}
          </div>
          
          {/* Actions */}
          <div className="d-flex gap-1 ms-2" onClick={(e) => e.stopPropagation()}>
            {timeline.length > 0 && (
              <button 
                type="button" 
                className="btn btn-sm p-1 text-primary" 
                onClick={(e) => { e.stopPropagation(); setShowHistory(true); }}
                title="Xem lịch sử ghi chú"
                style={{ background: '#e0f2fe', border: 'none', borderRadius: '4px', lineHeight: 1 }}
              >
                <i className="fas fa-list-ul" style={{ fontSize: '0.7rem' }}></i>
              </button>
            )}
            {canEdit && (
              <button 
                type="button" 
                className={`btn btn-sm p-1 ${isAdding ? 'text-danger' : 'text-success'}`} 
                onClick={(e) => { e.stopPropagation(); setIsAdding(!isAdding); }}
                title={isAdding ? "Hủy" : "Thêm ghi chú"}
                style={{ background: isAdding ? '#fee2e2' : '#dcfce7', border: 'none', borderRadius: '4px', lineHeight: 1, transition: 'all 0.2s' }}
              >
                <i className={`fas ${isAdding ? 'fa-times' : 'fa-plus'}`} style={{ fontSize: '0.7rem' }}></i>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Add new note modal - Always show if adding, even if inline */}
      {isAdding && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3" 
          style={{ zIndex: 1100, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} 
          onClick={handleCancel}
        >
          <div 
            ref={modalRef}
            className="bg-white rounded shadow-lg p-3 w-100" 
            style={{ 
              maxWidth: '450px',
              border: '1px solid #e2e8f0',
              animation: 'modalFadeIn 0.25s ease-out',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
            }} 
            onClick={e => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between mb-3 pb-2 border-bottom">
              <span className="fw-bold text-primary d-flex align-items-center" style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <i className="fas fa-edit me-2 bg-primary text-white p-1 rounded" style={{ fontSize: '0.7rem' }}></i> 
                Ghi chú xử lý mới
              </span>
              <button type="button" className="btn-close" style={{ fontSize: '0.7rem' }} onClick={handleCancel}></button>
            </div>
            
            <div className="mb-1 text-muted small fw-bold">NỘI DUNG XỬ LÝ:</div>
            <textarea
              ref={inputRef}
              className="form-control mb-4 border-0 bg-light"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập nội dung chi tiết việc đã thực hiện..."
              disabled={isSaving}
              style={{ 
                fontSize: '0.9rem', 
                resize: 'vertical', 
                minHeight: '120px', 
                borderRadius: '8px', 
                padding: '12px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0 !important'
              }}
            />
            
            <div className="d-flex justify-content-end gap-2">
              <button 
                type="button"
                className="btn btn-primary px-4 py-2 rounded-pill d-flex align-items-center" 
                onClick={handleSave}
                disabled={isSaving || !newNote.trim()}
                style={{ fontSize: '0.8rem', fontWeight: '600', transition: 'all 0.2s' }}
              >
                {isSaving ? (
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                ) : (
                  <i className="fas fa-save me-2"></i>
                )}
                Lưu ghi chú
              </button>
              <button 
                type="button"
                className="btn btn-light px-4 py-2 rounded-pill border" 
                onClick={handleCancel}
                disabled={isSaving}
                style={{ fontSize: '0.8rem', fontWeight: '500' }}
              >
                Hủy
              </button>
            </div>
          </div>
          <style jsx>{`
            @keyframes modalFadeIn {
              from { opacity: 0; transform: scale(0.95) translateY(10px); }
              to { opacity: 1; transform: scale(1) translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* History Modal (only if not inline) */}
      {!inline && showHistory && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={(e) => { e.stopPropagation(); setShowHistory(false); }}>
          <div className="bg-white rounded shadow-lg d-flex flex-column" style={{ width: '90%', maxWidth: '500px', maxHeight: '80vh' }} onClick={e => e.stopPropagation()}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
              <h6 className="mb-0 fw-bold"><i className="fas fa-history text-primary me-2"></i>Lịch sử ghi chú xử lý</h6>
              <button 
                type="button" 
                className="btn-close" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowHistory(false);
                }}
              ></button>
            </div>
            <div className="p-3 overflow-auto flex-grow-1" style={{ backgroundColor: '#f8fafc' }}>
              <div className="timeline-container">
                {timeline.map((entry, idx) => (
                  <div key={entry.id || idx} className="mb-3 p-2 rounded border bg-white shadow-sm position-relative">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-bold" style={{ fontSize: '0.8rem', color: entry.type === 'auto' ? '#059669' : '#1e293b' }}>
                        {entry.type === 'auto' && <i className="fas fa-robot me-1 text-success"></i>}
                        {entry.author}
                      </span>
                      <div className="d-flex align-items-center gap-2">
                        {canEdit && entry.type !== 'auto' && (
                          <div className="d-flex gap-1 me-2">
                            <button 
                              type="button"
                              className="btn btn-link p-0 text-primary" 
                              style={{ fontSize: '0.7rem' }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditingEntryId(entry.id);
                                setEditingContent(entry.content);
                              }}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button 
                              type="button"
                              className="btn btn-link p-0 text-danger" 
                              style={{ fontSize: '0.7rem' }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDeleteEntry(entry.id);
                              }}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        )}
                        <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                          {formatDateLabel(entry.timestamp)}
                        </span>
                      </div>
                    </div>
                    {editingEntryId === entry.id ? (
                      <div className="mt-1">
                        <textarea 
                          className="form-control form-control-sm mb-2" 
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          style={{ fontSize: '0.8rem' }}
                          rows={3}
                        />
                        <div className="d-flex justify-content-end gap-2">
                          <button 
                            type="button"
                            className="btn btn-sm btn-primary py-0" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUpdateEntry(entry.id);
                            }}
                          >
                            Lưu
                          </button>
                          <button 
                            type="button"
                            className="btn btn-sm btn-light border py-0" 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingEntryId(null);
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className={entry.type === 'auto' ? 'text-success fst-italic' : 'text-dark'} style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                        {entry.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Button to add when in inline mode */}
      {inline && !isAdding && canEdit && (
        <button 
          type="button" 
          className="btn btn-outline-success btn-sm w-100 rounded-pill mt-1" 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsAdding(true);
          }}
          style={{ fontSize: '0.75rem', fontWeight: '600' }}
        >
          <i className="fas fa-plus me-1"></i> Thêm ghi chú mới
        </button>
      )}
    </div>
  );
};

export default HandlerNotesEditor;
