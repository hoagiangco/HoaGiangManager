'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/contexts/AuthContext';
import api from '@/lib/utils/api';
import { toast } from 'react-toastify';
import { format, addDays, addWeeks, subWeeks } from 'date-fns';
import Loading from '@/components/Loading';

// Portal component để render popup thoát khỏi mọi overflow/clip của container cha
function PopupPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ScheduleCell {
  id?: number;
  content: string;
  note?: string;
}

interface StaffRow {
  staffId: number;
  staffName: string;
  departmentId: number;
  departmentName: string;
  days: Record<number, ScheduleCell>;
}

interface DeptGroup {
  departmentId: number;
  departmentName: string;
  staff: StaffRow[];
}

interface Department {
  id: number;
  name: string;
}

interface StaffItem {
  id: number;
  name: string;
  departmentId?: number;
  departmentName?: string;
}

interface PendingTask {
  id: number;
  content: string;
  location?: string;
  deviceName?: string;
  reportDate: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
const QUICK_CONTENT = [
  'S-C', 'Nghỉ', 'S-C Nghỉ', 'Trực', 'Hội nghị', 
  'Công tác', 'Khảo sát', 'Đào tạo', 'Bảo trì', 
  'Nghỉ phép', 'Kiểm tra', 'Nghiệm thu'
];

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatShort(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(2)}`;
}

function formatFull(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

// ─── Cell Editor ─────────────────────────────────────────────────────────────
interface CellEditorProps {
  staffId: number;
  staffName: string;
  dayIndex: number;
  cell: ScheduleCell;
  pendingTasks: PendingTask[];
  onSave: (staffId: number, dayOfWeek: number, content: string, note: string) => void;
}

function CellEditor({ staffId, staffName, dayIndex, cell, pendingTasks, onSave }: CellEditorProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(cell.content);
  const [note, setNote] = useState(cell.note || '');
  const [tab, setTab] = useState<'text' | 'pick'>('text');
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const [customQuickOpts, setCustomQuickOpts] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const POPUP_WIDTH = 360;
  const POPUP_HEIGHT = 460; // ước lượng chiều cao popup

  const computePopupStyle = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.left;
    let top = rect.bottom + 4;

    // Nếu popup bị tràn sang phải → align right
    if (left + POPUP_WIDTH > vw - 8) {
      left = rect.right - POPUP_WIDTH;
    }
    // Đảm bảo không ra ngoài bên trái
    if (left < 8) left = 8;

    // Nếu popup bị tràn xuống dưới → hiện lên trên cell
    if (top + POPUP_HEIGHT > vh - 8 && rect.top > POPUP_HEIGHT + 8) {
      top = rect.top - POPUP_HEIGHT - 4;
    }
    // Đảm bảo không ra ngoài trên cùng
    if (top < 8) top = 8;

    setPopupStyle({ position: 'fixed', top, left, width: POPUP_WIDTH, zIndex: 99999 });
  };

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('ws_custom_quick');
      if (saved) {
        try { setCustomQuickOpts(JSON.parse(saved)); } catch {}
      } else {
        setCustomQuickOpts(QUICK_CONTENT);
      }
      computePopupStyle();
    }
  }, [open]);

  useEffect(() => {
    setContent(cell.content);
    setNote(cell.note || '');
  }, [cell.content, cell.note]);

  // Cập nhật vị trí popup khi scroll hoặc resize
  useEffect(() => {
    if (!open) return;
    const update = () => computePopupStyle();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const clickedInCell = ref.current && ref.current.contains(e.target as Node);
      const clickedInPopup = popupRef.current && popupRef.current.contains(e.target as Node);
      if (!clickedInCell && !clickedInPopup) {
        handleSave();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, content, note]);

  const handleSave = () => {
    onSave(staffId, dayIndex, content.trim(), note.trim());
  };

  const handleClose = () => {
    handleSave();
    setOpen(false);
  };

  const handleQuick = (val: string) => {
    const newContent = content ? `${content}\n${val}` : val;
    setContent(newContent);
  };

  const handlePickTask = (task: PendingTask) => {
    const label = task.deviceName
      ? `${task.deviceName}${task.location ? ' - ' + task.location : ''}`
      : task.content.slice(0, 60);
    const newContent = content ? `${content}\n${label}` : label;
    setContent(newContent);
    // Auto-save và đóng popup ngay khi chọn từ danh sách
    onSave(staffId, dayIndex, newContent.trim(), note.trim());
    setOpen(false);
  };

  const handleAddCustom = () => {
    const val = window.prompt('Nhập nội dung gợi ý nhanh (VD: Bảo hành, Kiểm kê...):');
    if (val && val.trim()) {
      const next = [...customQuickOpts, val.trim()];
      setCustomQuickOpts(next);
      localStorage.setItem('ws_custom_quick', JSON.stringify(next));
    }
  };

  const handleRemoveCustom = (e: React.MouseEvent, val: string) => {
    e.stopPropagation();
    if (window.confirm(`Xóa gợi ý "${val}"?`)) {
      const next = customQuickOpts.filter(q => q !== val);
      setCustomQuickOpts(next);
      localStorage.setItem('ws_custom_quick', JSON.stringify(next));
    }
  };

  const displayContent = cell.content || '';

  return (
    <div className="ws-cell-wrapper" ref={ref}>
      <div
        className={`ws-cell ${open ? 'ws-cell--active' : ''} ${displayContent ? '' : 'ws-cell--empty'}`}
        onClick={() => setOpen(true)}
        title={`${staffName} - ${DAYS[dayIndex - 1]}: ${displayContent || 'Nhấp để nhập'}`}
      >
        <span className="ws-cell-text">{displayContent || <span className="ws-cell-placeholder">+</span>}</span>
        {cell.note && !open && <span className="ws-cell-note">{cell.note}</span>}
      </div>

      {open && typeof window !== 'undefined' && (
        <PopupPortal>
          <div
            ref={popupRef}
            className="ws-popup"
            style={popupStyle}
            onMouseDown={e => e.stopPropagation()}
          >
            <div className="ws-popup-header">
              <span>{staffName} — {DAYS[dayIndex - 1]}</span>
              <button className="ws-popup-close" onClick={handleClose}>✕</button>
            </div>

            <div className="ws-popup-tabs">
              <button className={`ws-tab-btn ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>
                <i className="fas fa-edit" /> Nhập thủ công
              </button>
              <button className={`ws-tab-btn ${tab === 'pick' ? 'active' : ''}`} onClick={() => setTab('pick')}>
                <i className="fas fa-list-check" /> Chọn từ danh sách ({pendingTasks.length})
              </button>
            </div>

            {tab === 'text' && (
              <div className="ws-popup-body">
                <div className="ws-quick-btns">
                  {customQuickOpts.map(q => (
                    <button key={`custom-${q}`} className="ws-quick-btn ws-quick-btn--custom" onClick={() => handleQuick(q)}>
                      {q}
                      <span className="ws-quick-remove" onClick={(e) => handleRemoveCustom(e, q)}>✕</span>
                    </button>
                  ))}
                  <button className="ws-quick-btn ws-quick-btn--add" onClick={handleAddCustom} title="Thêm gợi ý">
                    <i className="fas fa-plus" />
                  </button>
                </div>
                <textarea
                  className="ws-textarea"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Nội dung công việc (S-C, Nghỉ, Trực HN...)"
                  rows={4}
                  autoFocus
                />
                <textarea
                  className="ws-textarea ws-textarea--note"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú (thời gian, địa điểm...)"
                  rows={2}
                />
              </div>
            )}

            {tab === 'pick' && (
              <div className="ws-popup-body ws-pick-list">
                {pendingTasks.length === 0 ? (
                  <div className="ws-pick-empty">Không có việc tồn đọng</div>
                ) : (
                  pendingTasks.map(task => (
                    <div key={task.id} className="ws-pick-item" onClick={() => handlePickTask(task)}>
                      <div className="ws-pick-title">
                        {task.deviceName ? `[${task.deviceName}] ` : ''}{task.content.slice(0, 80)}
                      </div>
                      {task.location && <div className="ws-pick-meta">{task.location}</div>}
                      <div className="ws-pick-date">{task.reportDate ? task.reportDate.slice(0, 10) : ''}</div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="ws-popup-footer">
              <button className="ws-btn ws-btn--clear" onClick={() => { setContent(''); setNote(''); }}>Xóa</button>
              <button className="ws-btn ws-btn--save" onClick={handleClose}>Lưu</button>
            </div>
          </div>
        </PopupPortal>
      )}
    </div>
  );
}

// ─── Staff Selector Modal ─────────────────────────────────────────────────────
interface StaffSelectorProps {
  open: boolean;
  onClose: () => void;
  allStaff: StaffItem[];
  selectedIds: Set<number>;
  departments: Department[];
  onSave: (ids: number[]) => void;
  saving: boolean;
}

function StaffSelectorModal({ open, onClose, allStaff, selectedIds, departments, onSave, saving }: StaffSelectorProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set(selectedIds));
  const [filterDept, setFilterDept] = useState<number>(0);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setSelected(new Set(selectedIds));
  }, [selectedIds, open]);

  if (!open) return null;

  const filtered = allStaff.filter(s => {
    if (filterDept > 0 && s.departmentId !== filterDept) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by department
  const grouped: Record<string, StaffItem[]> = {};
  for (const s of filtered) {
    const deptName = s.departmentName || 'Không xác định';
    if (!grouped[deptName]) grouped[deptName] = [];
    grouped[deptName].push(s);
  }

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    const next = new Set(selected);
    filtered.forEach(s => next.add(s.id));
    setSelected(next);
  };

  const deselectAll = () => {
    const next = new Set(selected);
    filtered.forEach(s => next.delete(s.id));
    setSelected(next);
  };

  return (
    <div className="ws-modal-overlay" onClick={onClose}>
      <div className="ws-modal" onClick={e => e.stopPropagation()}>
        <div className="ws-modal-header">
          <h3><i className="fas fa-user-check" /> Chọn nhân viên tham gia lịch tuần</h3>
          <button className="ws-popup-close" onClick={onClose}>✕</button>
        </div>
        <div className="ws-modal-toolbar">
          <input
            type="text"
            className="ws-modal-search"
            placeholder="Tìm nhân viên..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className="ws-select" value={filterDept} onChange={e => setFilterDept(Number(e.target.value))}>
            <option value={0}>Tất cả bộ phận</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <button className="ws-modal-action-btn" onClick={selectAll}>Chọn tất cả</button>
          <button className="ws-modal-action-btn ws-modal-action-btn--danger" onClick={deselectAll}>Bỏ chọn</button>
        </div>
        <div className="ws-modal-body">
          {Object.entries(grouped).map(([deptName, staffList]) => (
            <div key={deptName} className="ws-modal-dept-group">
              <div className="ws-modal-dept-title">{deptName}</div>
              <div className="ws-modal-staff-list">
                {staffList.map(s => (
                  <label key={s.id} className={`ws-modal-staff-item ${selected.has(s.id) ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                    <span className="ws-modal-staff-name">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="ws-pick-empty">Không tìm thấy nhân viên</div>
          )}
        </div>
        <div className="ws-modal-footer">
          <span className="ws-modal-count">{selected.size} nhân viên đã chọn</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="ws-btn ws-btn--outline" onClick={onClose} style={{ padding: '8px 20px' }}>Hủy</button>
            <button
              className="ws-btn ws-btn--primary"
              onClick={() => onSave(Array.from(selected))}
              disabled={saving}
              style={{ padding: '8px 24px' }}
            >
              {saving ? <><i className="fas fa-circle-notch fa-spin" /> Đang lưu...</> : <><i className="fas fa-check" /> Lưu</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function WeeklySchedulePage() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole('SuperAdmin');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentMonday, setCurrentMonday] = useState<Date>(() => getMondayOf(new Date()));

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number>(0);
  const [groups, setGroups] = useState<DeptGroup[]>([]);
  const [pendingTasksByStaff, setPendingTasksByStaff] = useState<Record<number, PendingTask[]>>({});

  // Staff selection
  const [allStaff, setAllStaff] = useState<StaffItem[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [staffSaving, setStaffSaving] = useState(false);

  // Local edit state
  const [editState, setEditState] = useState<Record<string, ScheduleCell>>({});
  const [weeklyNote, setWeeklyNote] = useState('');
  const pendingSaves = useRef<Record<string, ScheduleCell>>({});
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noteSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekStartStr = format(currentMonday, 'yyyy-MM-dd');
  const sunday = addDays(currentMonday, 6);

  // ── Load departments & all staff once
  useEffect(() => {
    Promise.allSettled([
      api.get('/departments').then(res => {
        if (res.data.status) setDepartments(res.data.data);
      }),
      api.get('/staff?departmentId=0').then(res => {
        if (res.data.status) setAllStaff(res.data.data);
      }),
      api.get('/weekly-schedule/staff').then(res => {
        if (res.data.status) {
          setSelectedStaffIds(new Set(res.data.data.map((s: any) => s.staffId)));
        }
      }),
    ]);
  }, []);

  // ── Load schedule whenever week or dept changes
  const loadSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/weekly-schedule?weekStart=${weekStartStr}&departmentId=${selectedDeptId}`
      );
      if (res.data.status) {
        setWeeklyNote(res.data.weeklyNote || '');
        const newGroups: DeptGroup[] = res.data.data;
        setGroups(newGroups);
        const initial: Record<string, ScheduleCell> = {};
        for (const g of newGroups) {
          for (const s of g.staff) {
            for (let d = 1; d <= 7; d++) {
              const key = `${s.staffId}:${d}`;
              initial[key] = s.days[d] || { content: '', note: '' };
            }
          }
        }
        setEditState(initial);

        // Load pending tasks
        const staffIds = newGroups.flatMap(g => g.staff.map(s => s.staffId));
        const taskMap: Record<number, PendingTask[]> = {};
        await Promise.allSettled(
          staffIds.map(sid =>
            api.get(`/work-plans/pending?staffId=${sid}`).then(r => {
              if (r.data.status) taskMap[sid] = r.data.data;
            })
          )
        );
        setPendingTasksByStaff(taskMap);
      }
    } catch {
      toast.error('Không thể tải lịch làm việc');
    } finally {
      setLoading(false);
    }
  }, [weekStartStr, selectedDeptId]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  // ── Debounce batch save
  const scheduleSave = useCallback((cells: Record<string, ScheduleCell>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const toSave = Object.entries(cells);
      if (toSave.length === 0) return;
      pendingSaves.current = {};
      setSaving(true);
      try {
        const payload = toSave.map(([key, cell]) => {
          const [staffId, dayOfWeek] = key.split(':').map(Number);
          return { weekStartDate: weekStartStr, staffId, dayOfWeek, content: cell.content, note: cell.note || '' };
        });
        await api.put('/weekly-schedule', { cells: payload, createdBy: user?.id });
      } catch {
        toast.error('Lưu thất bại, thử lại sau');
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [weekStartStr, user?.id]);

  const scheduleNoteSave = useCallback((note: string) => {
    if (noteSaveTimerRef.current) clearTimeout(noteSaveTimerRef.current);
    noteSaveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await api.put('/weekly-schedule', { weekStart: weekStartStr, weeklyNote: note, createdBy: user?.id });
      } catch {
        toast.error('Lưu ghi chú thất bại');
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [weekStartStr, user?.id]);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setWeeklyNote(val);
    scheduleNoteSave(val);
  };

  const handleCellSave = useCallback((staffId: number, dayOfWeek: number, content: string, note: string) => {
    const key = `${staffId}:${dayOfWeek}`;
    const cell = { content, note };
    setEditState(prev => ({ ...prev, [key]: cell }));
    pendingSaves.current[key] = cell;
    scheduleSave({ ...pendingSaves.current });
  }, [scheduleSave]);

  // ── Save selected staff
  const handleSaveStaff = async (ids: number[]) => {
    setStaffSaving(true);
    try {
      await api.put('/weekly-schedule/staff', { staffIds: ids });
      setSelectedStaffIds(new Set(ids));
      setStaffModalOpen(false);
      toast.success('Đã cập nhật danh sách nhân viên');
      loadSchedule();
    } catch {
      toast.error('Lưu thất bại');
    } finally {
      setStaffSaving(false);
    }
  };

  // ── Week navigation
  const goToPrevWeek = () => setCurrentMonday(prev => subWeeks(prev, 1));
  const goToNextWeek = () => setCurrentMonday(prev => addWeeks(prev, 1));
  const goToThisWeek = () => setCurrentMonday(getMondayOf(new Date()));

  // ── Print
  const handlePrint = () => {
    const deptIds = selectedDeptId > 0 ? selectedDeptId.toString() : '';
    const url = `/api/weekly-schedule/export?weekStart=${weekStartStr}${deptIds ? `&departmentIds=${deptIds}` : ''}`;
    window.open(url, '_blank');
  };

  if (!isSuperAdmin) {
    return (
      <div className="ws-access-denied">
        <div className="ws-denied-icon"><i className="fas fa-lock" /></div>
        <h3>Không có quyền truy cập</h3>
        <p>Chức năng này chỉ dành cho Super Admin.</p>
      </div>
    );
  }

  const dateHeaders = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(currentMonday, i);
    return { label: DAYS[i], date: formatShort(d) };
  });

  return (
    <>
      <style>{`
        /* ============================== Weekly Schedule Styles ============================== */
        .ws-page { padding: 0 0 40px 0; min-height: 100vh; background: linear-gradient(135deg, #f0f4ff 0%, #e8f0fe 100%); }

        .ws-header {
          background: linear-gradient(135deg, #1a56db 0%, #1e40af 100%);
          color: #fff; padding: 24px 28px 20px; border-radius: 0 0 20px 20px;
          margin-bottom: 24px; box-shadow: 0 4px 20px rgba(26,86,219,0.3);
        }
        .ws-header-top { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
        .ws-header h1 { font-size: 1.5rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 10px; }
        .ws-header h1 i { opacity: 0.85; }
        .ws-header-sub { font-size: 0.9rem; opacity: 0.85; margin-top: 4px; }
        .ws-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        .ws-toolbar {
          display: flex; align-items: center; gap: 14px; padding: 14px 28px;
          background: #fff; border-radius: 14px; margin: 0 16px 20px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.07); flex-wrap: wrap;
        }
        .ws-week-nav { display: flex; align-items: center; gap: 8px; }
        .ws-week-label { font-weight: 700; font-size: 1.05rem; color: #1a56db; min-width: 220px; text-align: center; }
        .ws-btn-nav {
          width: 36px; height: 36px; border-radius: 50%; border: 2px solid #1a56db;
          background: transparent; color: #1a56db; font-size: 14px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all .2s;
        }
        .ws-btn-nav:hover { background: #1a56db; color: #fff; }
        .ws-toolbar-sep { width: 1px; height: 32px; background: #e5e7eb; }

        .ws-select {
          border: 2px solid #e5e7eb; border-radius: 8px; padding: 6px 12px;
          font-size: 0.9rem; color: #1e293b; background: #fff; cursor: pointer;
          outline: none; transition: border .2s;
        }
        .ws-select:focus { border-color: #1a56db; }

        .ws-btn {
          padding: 7px 16px; border-radius: 8px; font-size: 0.875rem; font-weight: 600;
          cursor: pointer; border: none; display: inline-flex; align-items: center; gap: 6px; transition: all .2s;
        }
        .ws-btn--primary { background: #1a56db; color: #fff; }
        .ws-btn--primary:hover { background: #1e40af; transform: translateY(-1px); }
        .ws-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .ws-btn--outline { background: #fff; color: #1a56db; border: 2px solid #1a56db; }
        .ws-btn--outline:hover { background: #eff6ff; }
        .ws-btn--print { background: linear-gradient(135deg, #059669, #047857); color: #fff; }
        .ws-btn--print:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(5,150,105,0.3); }
        .ws-btn--staff { background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; }
        .ws-btn--staff:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.3); }

        .ws-saving-indicator { display: flex; align-items: center; gap: 6px; font-size: 0.82rem; color: #6b7280; }
        .ws-saving-indicator i { color: #1a56db; animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        /* Table */
        .ws-table-wrap { overflow-x: auto; margin: 0 16px; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .ws-table { width: 100%; border-collapse: separate; border-spacing: 0; background: #fff; border-radius: 16px; table-layout: fixed; }
        .ws-table thead th {
          background: #1a56db; color: #fff; font-weight: 700; text-align: center;
          padding: 11px 10px; font-size: 0.88rem; border-right: 1px solid rgba(255,255,255,0.15); white-space: nowrap;
        }
        .ws-table thead th:first-child { text-align: left; padding-left: 18px; width: 16%; }
        .ws-table thead th:not(:first-child) { width: 12%; }
        .ws-table thead .ws-date-row th {
          background: #dce6f1; color: #1e293b; font-weight: 600; font-size: 0.78rem;
          padding: 6px 10px; border-bottom: 2px solid #c3d4ed;
        }
        .ws-dept-row td {
          background: linear-gradient(90deg, #e8f0fe, #f0f4ff); font-weight: 800;
          font-size: 0.88rem; color: #1a56db; padding: 9px 18px; letter-spacing: 0.03em;
          border-top: 2px solid #c3d4ed; border-bottom: 1px solid #c3d4ed; text-transform: uppercase;
        }
        .ws-table tbody tr.ws-staff-row { transition: background .15s; }
        .ws-table tbody tr.ws-staff-row:hover { background: #f8faff; }
        .ws-staff-name-cell {
          padding: 0 6px 0 18px; font-weight: 600; font-size: 0.88rem; color: #1e293b;
          vertical-align: middle; border-right: 2px solid #e5e7eb; border-bottom: 1px solid #f1f5f9;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .ws-day-cell {
          padding: 2px; vertical-align: top; border-right: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9; position: relative;
        }

        /* Cell editor */
        .ws-cell-wrapper { position: relative; }
        .ws-cell {
          min-height: 52px; padding: 7px 10px; cursor: pointer; border-radius: 6px;
          transition: background .15s, box-shadow .15s; white-space: pre-wrap;
          word-break: break-word; font-size: 0.82rem; line-height: 1.4;
        }
        .ws-cell:hover { background: #eff6ff; box-shadow: inset 0 0 0 1.5px #93c5fd; }
        .ws-cell--active { background: #dbeafe !important; box-shadow: inset 0 0 0 2px #1a56db !important; }
        .ws-cell--empty .ws-cell-placeholder { color: #cbd5e1; font-size: 1.1rem; }
        .ws-cell-text { display: block; color: #1e293b; }
        .ws-cell-note { display: block; color: #6b7280; font-size: 0.75rem; font-style: italic; margin-top: 2px; }

        /* Popup editor – dùng position:fixed để thoát khỏi mọi overflow clip */
        .ws-popup {
          position: fixed; z-index: 99999;
          background: #fff; border-radius: 14px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.22), 0 0 0 1px rgba(26,86,219,0.15);
          width: 360px; animation: popIn .15s ease; overflow: hidden;
        }
        @keyframes popIn { from { opacity: 0; transform: translateY(-6px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes popUp { from { opacity: 0; transform: translateY(6px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .ws-popup-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 14px; background: linear-gradient(135deg, #1a56db, #1e40af);
          color: #fff; font-size: 0.85rem; font-weight: 700;
        }
        .ws-popup-close {
          background: none; border: none; color: #fff; font-size: 1rem; cursor: pointer;
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; transition: background .15s;
        }
        .ws-popup-close:hover { background: rgba(255,255,255,0.2); }

        .ws-popup-tabs { display: flex; border-bottom: 2px solid #e5e7eb; }
        .ws-tab-btn {
          flex: 1; padding: 8px 10px; border: none; background: #f8faff;
          color: #6b7280; font-size: 0.8rem; font-weight: 600; cursor: pointer;
          transition: all .15s; display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .ws-tab-btn.active { background: #fff; color: #1a56db; border-bottom: 2px solid #1a56db; margin-bottom: -2px; }
        .ws-tab-btn:hover:not(.active) { background: #eff6ff; }

        .ws-popup-body { padding: 12px 14px; }
        .ws-quick-btns { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
        .ws-quick-btn {
          padding: 4px 10px; border-radius: 20px; border: 1.5px solid #1a56db;
          background: #fff; color: #1a56db; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all .15s; display: inline-flex; align-items: center;
        }
        .ws-quick-btn:hover { background: #1a56db; color: #fff; }
        .ws-quick-btn--custom { border-color: #6366f1; color: #6366f1; }
        .ws-quick-btn--custom:hover { background: #6366f1; color: #fff; }
        .ws-quick-remove { margin-left: 6px; font-size: 0.7rem; opacity: 0.6; transition: opacity .15s; }
        .ws-quick-remove:hover { opacity: 1; color: #f87171; }
        .ws-quick-btn:hover .ws-quick-remove { opacity: 0.9; }
        .ws-quick-btn:hover .ws-quick-remove:hover { color: #fca5a5; }
        .ws-quick-btn--add { border-style: dashed; color: #64748b; border-color: #cbd5e1; }
        .ws-quick-btn--add:hover { background: #f8fafc; color: #334155; border-color: #94a3b8; }

        .ws-textarea {
          width: 100%; border: 2px solid #e5e7eb; border-radius: 8px;
          padding: 8px 10px; font-size: 0.85rem; font-family: inherit;
          resize: vertical; outline: none; color: #1e293b; transition: border .2s;
          display: block; margin-bottom: 8px;
        }
        .ws-textarea:focus { border-color: #1a56db; }
        .ws-textarea--note { font-size: 0.8rem; color: #6b7280; }

        .ws-pick-list { max-height: 240px; overflow-y: auto; padding: 8px 14px; }
        .ws-pick-empty { text-align: center; color: #9ca3af; padding: 20px; font-size: 0.85rem; }
        .ws-pick-item {
          padding: 9px 11px; border-radius: 8px; border: 1.5px solid #e5e7eb;
          margin-bottom: 6px; cursor: pointer; transition: all .15s;
        }
        .ws-pick-item:hover { border-color: #1a56db; background: #eff6ff; }
        .ws-pick-title { font-size: 0.82rem; color: #1e293b; font-weight: 600; }
        .ws-pick-meta { font-size: 0.76rem; color: #6b7280; margin-top: 2px; }
        .ws-pick-date { font-size: 0.72rem; color: #9ca3af; margin-top: 2px; }

        .ws-popup-footer {
          display: flex; justify-content: flex-end; gap: 8px;
          padding: 10px 14px; border-top: 1px solid #f1f5f9; background: #f8faff;
        }
        .ws-btn--clear {
          background: #fff; color: #ef4444; border: 1.5px solid #fca5a5;
          padding: 6px 14px; border-radius: 7px; font-size: 0.82rem; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .ws-btn--clear:hover { background: #fef2f2; }
        .ws-btn--save {
          background: #1a56db; color: #fff; border: none;
          padding: 6px 18px; border-radius: 7px; font-size: 0.82rem; font-weight: 700;
          cursor: pointer; transition: all .15s;
        }
        .ws-btn--save:hover { background: #1e40af; }

        /* Staff selector modal */
        .ws-modal-overlay {
          position: fixed; inset: 0; z-index: 2000; background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          animation: fadeIn .2s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .ws-modal {
          background: #fff; border-radius: 18px; width: 620px; max-width: 95vw;
          max-height: 85vh; display: flex; flex-direction: column;
          box-shadow: 0 20px 60px rgba(0,0,0,0.25); animation: popIn .2s ease;
        }
        .ws-modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background: linear-gradient(135deg, #7c3aed, #6d28d9);
          color: #fff; border-radius: 18px 18px 0 0;
        }
        .ws-modal-header h3 { margin: 0; font-size: 1.1rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .ws-modal-toolbar {
          display: flex; align-items: center; gap: 10px; padding: 12px 20px;
          border-bottom: 1px solid #e5e7eb; flex-wrap: wrap;
        }
        .ws-modal-search {
          flex: 1; min-width: 150px; border: 2px solid #e5e7eb; border-radius: 8px;
          padding: 7px 12px; font-size: 0.88rem; outline: none; transition: border .2s;
        }
        .ws-modal-search:focus { border-color: #7c3aed; }
        .ws-modal-action-btn {
          padding: 6px 14px; border-radius: 6px; border: 1.5px solid #7c3aed;
          background: #fff; color: #7c3aed; font-size: 0.78rem; font-weight: 600;
          cursor: pointer; transition: all .15s;
        }
        .ws-modal-action-btn:hover { background: #7c3aed; color: #fff; }
        .ws-modal-action-btn--danger { border-color: #ef4444; color: #ef4444; }
        .ws-modal-action-btn--danger:hover { background: #ef4444; color: #fff; }

        .ws-modal-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
        .ws-modal-dept-group { margin-bottom: 16px; }
        .ws-modal-dept-title {
          font-weight: 700; font-size: 0.85rem; color: #7c3aed;
          text-transform: uppercase; padding: 6px 0; border-bottom: 1.5px solid #e5e7eb;
          margin-bottom: 8px; letter-spacing: 0.03em;
        }
        .ws-modal-staff-list { display: flex; flex-wrap: wrap; gap: 6px; }
        .ws-modal-staff-item {
          display: flex; align-items: center; gap: 6px;
          padding: 7px 14px; border-radius: 8px; border: 1.5px solid #e5e7eb;
          cursor: pointer; transition: all .15s; font-size: 0.85rem;
        }
        .ws-modal-staff-item:hover { border-color: #7c3aed; background: #f5f3ff; }
        .ws-modal-staff-item.checked { border-color: #7c3aed; background: #ede9fe; }
        .ws-modal-staff-item input[type=checkbox] { accent-color: #7c3aed; }
        .ws-modal-staff-name { font-weight: 500; color: #1e293b; }

        .ws-modal-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 20px; border-top: 1px solid #e5e7eb; background: #f8faff;
          border-radius: 0 0 18px 18px;
        }
        .ws-modal-count { font-size: 0.85rem; color: #6b7280; font-weight: 600; }

        /* Access denied */
        .ws-access-denied {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          min-height: 60vh; gap: 16px; text-align: center;
        }
        .ws-denied-icon { font-size: 4rem; color: #d1d5db; }
        .ws-access-denied h3 { font-size: 1.4rem; color: #374151; }
        .ws-access-denied p { color: #6b7280; }

        .ws-empty { text-align: center; padding: 60px 20px; color: #9ca3af; }
        .ws-empty i { font-size: 3rem; margin-bottom: 12px; display: block; color: #d1d5db; }

        @media (max-width: 768px) {
          .ws-header { padding: 16px; }
          .ws-toolbar { margin: 0 8px 16px; padding: 12px; }
          .ws-table-wrap { margin: 0 8px; }
          .ws-popup { width: 300px; }
          .ws-week-label { min-width: 160px; font-size: 0.92rem; }
          .ws-modal { width: 95vw; }
        }
      `}</style>

      <div className="ws-page">
        {/* Header */}
        <div className="ws-header">
          <div className="ws-header-top">
            <div>
              <h1><i className="fas fa-calendar-week" /> Lịch Làm Việc Tuần</h1>
              <div className="ws-header-sub">Sắp xếp lịch công việc cho nhân viên từng ngày trong tuần</div>
            </div>
            <div className="ws-header-actions">
              <button className="ws-btn ws-btn--staff" onClick={() => setStaffModalOpen(true)}>
                <i className="fas fa-user-cog" /> Chọn nhân viên ({selectedStaffIds.size})
              </button>
              <button className="ws-btn ws-btn--print" onClick={handlePrint}>
                <i className="fas fa-print" /> In Lịch
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="ws-toolbar">
          <div className="ws-week-nav">
            <button className="ws-btn-nav" onClick={goToPrevWeek} title="Tuần trước">
              <i className="fas fa-chevron-left" />
            </button>
            <div className="ws-week-label">{formatFull(currentMonday)} – {formatFull(sunday)}</div>
            <button className="ws-btn-nav" onClick={goToNextWeek} title="Tuần sau">
              <i className="fas fa-chevron-right" />
            </button>
          </div>

          <button className="ws-btn ws-btn--outline" onClick={goToThisWeek} style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
            Tuần hiện tại
          </button>

          <div className="ws-toolbar-sep" />

          <select className="ws-select" value={selectedDeptId} onChange={e => setSelectedDeptId(Number(e.target.value))}>
            <option value={0}>Tất cả bộ phận</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <div className="ws-toolbar-sep" />

          {saving && (
            <span className="ws-saving-indicator">
              <i className="fas fa-circle-notch" /> Đang lưu...
            </span>
          )}
          {!saving && !loading && (
            <span style={{ fontSize: '0.8rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className="fas fa-check-circle" /> Đã lưu
            </span>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loading /></div>
        ) : groups.length === 0 ? (
          <div className="ws-empty" style={{ margin: '0 16px', background: '#fff', borderRadius: 16 }}>
            <i className="fas fa-users" />
            {selectedStaffIds.size === 0 ? (
              <>
                <p style={{ fontWeight: 600, marginBottom: 8, color: '#374151' }}>Chưa chọn nhân viên nào</p>
                <p>Nhấn nút <strong>"Chọn nhân viên"</strong> ở trên để thêm nhân viên vào lịch tuần.</p>
              </>
            ) : (
              <p>Không có nhân viên nào trong bộ phận đã chọn</p>
            )}
          </div>
        ) : (
          <div className="ws-table-wrap">
            <table className="ws-table">
              <thead>
                <tr>
                  <th>Họ và tên</th>
                  {dateHeaders.map((h, i) => <th key={i}>{h.label}</th>)}
                </tr>
                <tr className="ws-date-row">
                  <th></th>
                  {dateHeaders.map((h, i) => (
                    <th key={i} style={{ background: '#dce6f1', color: '#1e293b', fontWeight: 600, fontSize: '0.78rem' }}>
                      {h.date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  <> 
                    <tr key={`dept-${group.departmentId}`} className="ws-dept-row">
                      <td colSpan={8}>
                        <i className="fas fa-users" style={{ marginRight: 8 }} />
                        {group.departmentName.toUpperCase()}
                      </td>
                    </tr>
                    {group.staff.map(s => (
                      <tr key={s.staffId} className="ws-staff-row">
                        <td className="ws-staff-name-cell">{s.staffName}</td>
                        {Array.from({ length: 7 }, (_, i) => {
                          const dow = i + 1;
                          const key = `${s.staffId}:${dow}`;
                          const cell = editState[key] || { content: '', note: '' };
                          return (
                            <td key={dow} className="ws-day-cell">
                              <CellEditor
                                staffId={s.staffId}
                                staffName={s.staffName}
                                dayIndex={dow}
                                cell={cell}
                                pendingTasks={pendingTasksByStaff[s.staffId] || []}
                                onSave={handleCellSave}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Weekly Note Section */}
        {!loading && groups.length > 0 && (
          <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 12, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: '#1a56db', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-sticky-note" /> Ghi chú tuần (hiển thị phần Lưu ý khi in)
            </h4>
            <textarea
              value={weeklyNote}
              onChange={handleNoteChange}
              placeholder="Nhập ghi chú chung cho tuần này..."
              style={{
                width: '100%',
                minHeight: '60px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '0.85rem',
                outline: 'none',
                resize: 'vertical',
                color: '#1e293b'
              }}
              onFocus={e => (e.target.style.borderColor = '#1a56db')}
              onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
            />
          </div>
        )}

        {/* Legend */}
        {!loading && groups.length > 0 && (
          <div style={{
            margin: '16px 16px 0', padding: '12px 18px', background: '#fff', borderRadius: 12,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center',
            gap: 20, flexWrap: 'wrap', fontSize: '0.8rem', color: '#6b7280'
          }}>
            <span><strong>Hướng dẫn:</strong></span>
            <span><i className="fas fa-mouse-pointer" style={{ color: '#1a56db', marginRight: 4 }} />Click vào ô để nhập nội dung</span>
            <span><i className="fas fa-list-check" style={{ color: '#1a56db', marginRight: 4 }} />Tab "Chọn từ danh sách" để thêm việc tồn đọng</span>
            <span><i className="fas fa-save" style={{ color: '#10b981', marginRight: 4 }} />Tự động lưu sau khi nhập</span>
            <span><i className="fas fa-print" style={{ color: '#059669', marginRight: 4 }} />Nút "In Lịch" để in tất cả trên cùng 1 trang</span>
          </div>
        )}
      </div>

      {/* Staff Selector Modal */}
      <StaffSelectorModal
        open={staffModalOpen}
        onClose={() => setStaffModalOpen(false)}
        allStaff={allStaff}
        selectedIds={selectedStaffIds}
        departments={departments}
        onSave={handleSaveStaff}
        saving={staffSaving}
      />
    </>
  );
}
