'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/utils/api';
import useSWR, { mutate as globalMutate } from 'swr';
import { fetcher } from '@/lib/utils/swr-fetcher';
import { toast } from 'react-toastify';
import { formatDateDisplay, formatDateInput } from '@/lib/utils/dateFormat';
import DateInput from '@/components/DateInput';
import AdminRoute from '@/components/AdminRoute';
import { DeviceCategory, EventType, DeviceVM, DamageReportVM } from '@/types';
import QuickViewReportModal from '@/components/QuickViewReportModal';
import { getDamageReportPermissions, isAdmin } from '@/lib/auth/permissions';
import ExportModal from '@/components/ExportModal';

interface UpcomingPlan {
  id: number;
  deviceId: number;
  deviceName: string;
  nextDueDate: string;
  daysUntilDue: number;
  title: string;
  maintenanceType: 'internal' | 'outsource' | null;
  maintenanceProvider: string | null;
  maintenanceBatchId: string | null;
}

const getShortTitle = (title?: string | null): string => {
  if (!title) return 'Không có tiêu đề';
  
  let shortTitle = title.trim();

  // Xử lý các phần trùng lặp (ví dụ "Máy lạnh - Máy lạnh") do backend nhóm chuỗi
  let parts = shortTitle.split(' - ').map(p => p.trim()).filter(Boolean);
  const uniqueParts: string[] = [];
  parts.forEach(part => {
    if (!uniqueParts.some(up => up.toLowerCase() === part.toLowerCase())) {
      uniqueParts.push(part);
    }
  });
  
  if (uniqueParts.length === 0) return title;
  
  const result = uniqueParts.join(' - ');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

interface MaintenanceBatch {
  batchId: string;
  title: string;
  totalDevices: number;
  activePlansCount: number;
  completed: number;
  inProgress: number;
  planned: number;
  cancelled: number;
  progressPercentage: number;
  isCancelled?: boolean;
}

interface MaintenancePlanForm {
  selectionType: 'category' | 'devices';
  categoryId: number;
  deviceIds: number[];
  eventTypeId: number;
  title: string;
  description: string;
  intervalValue: number;
  intervalUnit: 'day' | 'week' | 'month' | 'year';
  startFrom: string;
  endAt: string;
  maintenanceType: 'internal' | 'outsource';
  maintenanceProvider: string;
  cost: number;
}

interface DeviceReminderPlanVM {
  id: number;
  deviceId: number;
  deviceName?: string;
  reminderType: string;
  eventTypeId?: number | null;
  eventTypeName?: string;
  title?: string | null;
  description?: string | null;
  intervalValue?: number | null;
  intervalUnit?: string | null;
  cronExpression?: string | null;
  startFrom?: Date | null;
  endAt?: Date | null;
  nextDueDate?: Date | null;
  lastTriggeredAt?: Date | null;
  isActive: boolean;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
  createdAt?: Date | null;
  updatedBy?: string | null;
  updatedAt?: Date | null;
  // Thông tin về lần bảo trì hoàn thành gần nhất
  lastCompletedEvent?: {
    endDate?: Date | null;
    staffName?: string | null;
    notes?: string | null;
  } | null;
}

interface BatchEvent {
  id: number;
  title: string;
  deviceId: number;
  deviceName: string;
  eventTypeId: number;
  eventTypeName: string;
  description: string;
  status: string;
  eventDate: string;
  startDate: string;
  endDate: string;
  staffId: number;
  staffName: string;
  maintenanceBatchId: string;
  maintenanceType: string;
  maintenanceProvider: string;
  relatedReportId?: number | null;
  createdAt: string;
  updatedAt: string;
}

function MaintenancePageContent() {
  const [activeTab, setActiveTab] = useState<'create' | 'batches' | 'plans' | 'cancelled'>('plans');
  const [upcomingPlans, setUpcomingPlans] = useState<UpcomingPlan[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<BatchEvent[]>([]);
  const [batches, setBatches] = useState<MaintenanceBatch[]>([]);
  const [allPlans, setAllPlans] = useState<DeviceReminderPlanVM[]>([]);
  const [planEvents, setPlanEvents] = useState<Record<number, BatchEvent>>({}); // Map planId -> latest event
  const [maintenanceReports, setMaintenanceReports] = useState<DamageReportVM[]>([]); // All damage reports for matching
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportParams, setExportParams] = useState<Record<string, any>>({});
  const [exportTitle, setExportTitle] = useState('');

  // Modals
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchEvents, setBatchEvents] = useState<BatchEvent[]>([]);
  const [loadingBatchDetails, setLoadingBatchDetails] = useState(false);
  const [batchModalTab, setBatchModalTab] = useState<'events' | 'rounds'>('events');
  const [maintenanceRounds, setMaintenanceRounds] = useState<any[]>([]);
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [showRoundDetailModal, setShowRoundDetailModal] = useState(false);
  const [selectedRound, setSelectedRound] = useState<{ batchId: string; roundDate: string } | null>(null);
  const [roundDetail, setRoundDetail] = useState<any>(null);
  const [loadingRoundDetail, setLoadingRoundDetail] = useState(false);

  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditIntervalModal, setShowEditIntervalModal] = useState(false);
  const [showViewPlanModal, setShowViewPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DeviceReminderPlanVM | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [editIntervalValue, setEditIntervalValue] = useState<number>(6);
  const [editIntervalUnit, setEditIntervalUnit] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedGroupForInterval, setSelectedGroupForInterval] = useState<{
    batchId: string;
    title: string;
    plans: DeviceReminderPlanVM[];
    metadata?: Record<string, any> | null;
  } | null>(null);
  const [editBatchTitle, setEditBatchTitle] = useState('');
  const [editBatchDescription, setEditBatchDescription] = useState('');
  const [editBatchMaintenanceType, setEditBatchMaintenanceType] = useState<'internal' | 'outsource'>('internal');
  const [editBatchProvider, setEditBatchProvider] = useState('');
  const [editBatchCost, setEditBatchCost] = useState(0);
  const [editBatchEventTypeId, setEditBatchEventTypeId] = useState(0);
  const [editBatchStartFrom, setEditBatchStartFrom] = useState('');
  const [editBatchEndAt, setEditBatchEndAt] = useState('');
  const [selectedBatchTitle, setSelectedBatchTitle] = useState('');
  const [savingBatchEdit, setSavingBatchEdit] = useState(false);

  // Batch actions
  const [showBatchRescheduleModal, setShowBatchRescheduleModal] = useState(false);
  const [showBatchCancelModal, setShowBatchCancelModal] = useState(false);
  const [showBatchCompleteModal, setShowBatchCompleteModal] = useState(false);
  const [batchCompleteDate, setBatchCompleteDate] = useState('');
  const [batchCompleteNotes, setBatchCompleteNotes] = useState('');
  const [batchCompleteStaffId, setBatchCompleteStaffId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{
    batchId: string;
    title: string;
    plans: DeviceReminderPlanVM[];
  } | null>(null);
  const [batchRescheduleDate, setBatchRescheduleDate] = useState('');
  const [batchRescheduleReason, setBatchRescheduleReason] = useState('');
  const [batchCancelReason, setBatchCancelReason] = useState('');

  // Add/Remove devices
  const [showAddDevicesModal, setShowAddDevicesModal] = useState(false);
  const [showRemoveDevicesModal, setShowRemoveDevicesModal] = useState(false);
  const [selectedGroupForDevices, setSelectedGroupForDevices] = useState<{
    batchId: string;
    title: string;
    plans: DeviceReminderPlanVM[];
    metadata: Record<string, any> | null;
  } | null>(null);
  const [devicesToAdd, setDevicesToAdd] = useState<DeviceVM[]>([]);
  const [devicesToRemove, setDevicesToRemove] = useState<DeviceVM[]>([]);

  // Complete maintenance modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<BatchEvent | null>(null);
  const [completeDate, setCompleteDate] = useState('');
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeStaffId, setCompleteStaffId] = useState<number | null>(null);
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string }>>([]);

  // Start maintenance modal
  const [showStartModal, setShowStartModal] = useState(false);
  const [startStaffId, setStartStaffId] = useState<number | null>(null);
  const [startNotes, setStartNotes] = useState('');

  // Device selection modal
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [allDevices, setAllDevices] = useState<DeviceVM[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<DeviceVM[]>([]);
  const [deviceSearchKeyword, setDeviceSearchKeyword] = useState('');
  const [selectedDevices, setSelectedDevices] = useState<DeviceVM[]>([]);
  const [categoryDevices, setCategoryDevices] = useState<DeviceVM[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Form data
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [formData, setFormData] = useState<MaintenancePlanForm>({
    selectionType: 'category',
    categoryId: 0,
    deviceIds: [],
    eventTypeId: 1, // Mặc định là Bảo trì
    title: '',
    description: '',
    intervalValue: 6,
    intervalUnit: 'month',
    startFrom: formatDateInput(new Date()),
    endAt: '',
    maintenanceType: 'internal',
    maintenanceProvider: '',
    cost: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [selectedQuickReportId, setSelectedQuickReportId] = useState<number | null>(null);

  // Read tab from URL query parameter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      const validTabs: Array<'create' | 'batches' | 'plans' | 'cancelled'> = ['create', 'batches', 'plans', 'cancelled'];
      if (tabParam && validTabs.includes(tabParam as any)) {
        setActiveTab(tabParam as 'create' | 'batches' | 'plans' | 'cancelled');
      }
    }
  }, []);

  // Static data for form
  const { data: catData } = useSWR(activeTab === 'create' ? '/device-categories' : null, fetcher);
  const { data: eventTypeData } = useSWR(activeTab === 'create' ? '/event-types' : null, fetcher);

  useEffect(() => {
    if (catData?.status) setCategories(catData.data || []);
    if (eventTypeData?.status) {
      const types = eventTypeData.data || [];
      setEventTypes(types);
      
      // Tự động tìm ID Bảo trì nếu chưa có hoặc đang là 0
      const maintenanceType = types.find((t: any) => 
        t.name.toLowerCase().includes('bảo trì') || 
        t.name.toLowerCase() === 'maintenance'
      );
      
      if (maintenanceType) {
        setFormData(prev => ({ ...prev, eventTypeId: maintenanceType.id }));
      }
    }
  }, [catData, eventTypeData]);

  // Main polling data
  const { data: batchesResponse, isLoading: loadingBatches, mutate: mutateBatches } = useSWR(
    activeTab === 'batches' ? '/events/maintenance-batches?all=true' : null, 
    fetcher, 
    { refreshInterval: 20000 }
  );

  const { data: plansResponse, isLoading: loadingPlans, mutate: mutatePlans } = useSWR(
    (activeTab === 'plans' || activeTab === 'cancelled') ? '/device-reminder-plans' : null, 
    fetcher, 
    { refreshInterval: 20000 }
  );

  const { data: eventsResponse, mutate: mutateEvents } = useSWR(
    (activeTab === 'plans' || activeTab === 'cancelled' || activeTab === 'batches') ? '/events?eventTypeId=0' : null, 
    fetcher, 
    { refreshInterval: 15000 }
  );

  const { data: reportsResponse } = useSWR(
    (activeTab === 'plans' || activeTab === 'cancelled') ? '/damage-reports' : null, 
    fetcher, 
    { refreshInterval: 20000 }
  );

  useEffect(() => {
    if (batchesResponse?.status) setBatches(batchesResponse.data || []);
  }, [batchesResponse]);

  useEffect(() => {
    if (plansResponse?.status) {
      const plans = plansResponse.data || [];
      setAllPlans(plans);

      if (eventsResponse?.status) {
        const allEvents = eventsResponse.data || [];
        const eventsMap: Record<number, BatchEvent> = {};

        plans.forEach((plan: DeviceReminderPlanVM) => {
          const planBatchId = plan.metadata?.maintenanceBatchId;
          const matchingEvents = allEvents.filter((event: any) => {
            const eventBatchId = event.metadata?.maintenanceBatchId;
            return event.deviceId === plan.deviceId &&
              event.eventTypeId === plan.eventTypeId &&
              eventBatchId === planBatchId &&
              (event.status === 'planned' || event.status === 'in_progress' || event.status === 'completed');
          });

          if (matchingEvents.length > 0) {
            const latestEvent = matchingEvents.sort((a: any, b: any) => {
              const dateA = a.eventDate ? new Date(a.eventDate).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
              const dateB = b.eventDate ? new Date(b.eventDate).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
              return dateB - dateA;
            })[0];
            eventsMap[plan.id] = latestEvent;

            const completedEvents = matchingEvents
              .filter((e: any) => e.status === 'completed')
              .sort((a: any, b: any) => {
                const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
                const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
                return dateB - dateA;
              });

            if (completedEvents.length > 0) {
              const lastCompleted = completedEvents[0];
              plan.lastCompletedEvent = {
                endDate: lastCompleted.endDate ? new Date(lastCompleted.endDate) : null,
                staffName: lastCompleted.staffName || null,
                notes: lastCompleted.description || lastCompleted.notes || null,
              };
            }
          }
        });
        setPlanEvents(eventsMap);
      }

      if (reportsResponse?.status) {
        setMaintenanceReports(reportsResponse.data || []);
      }
    }
  }, [plansResponse, eventsResponse, reportsResponse]);

  useEffect(() => {
    setLoading(loadingBatches || loadingPlans);
  }, [loadingBatches, loadingPlans]);

  const loadData = async () => { 
    mutateBatches(); 
    mutateEvents(); 
    globalMutate('/reports/pending');
  };
  const loadFormData = async () => {};
  const loadAllPlans = async () => { 
    mutatePlans(); 
    mutateEvents(); 
    globalMutate('/reports/pending');
  };

  // Load devices when category changes
  useEffect(() => {
    if (formData.selectionType === 'category' && formData.categoryId > 0) {
      loadCategoryDevices(formData.categoryId);
      
      // Tự động điền tiêu đề từ tên danh mục nếu tiêu đề đang trống
      const category = categories.find(c => c.id === formData.categoryId);
      if (category && !formData.title.trim()) {
        setFormData(prev => ({ ...prev, title: category.name }));
      }
    } else {
      setCategoryDevices([]);
    }
  }, [formData.categoryId, formData.selectionType, categories]);

  // Load selected devices info when needed (not auto on deviceIds change to avoid conflicts)
  // This will be called manually when needed

  // Filter devices when search keyword changes
  useEffect(() => {
    if (deviceSearchKeyword.trim()) {
      const keyword = deviceSearchKeyword.toLowerCase();
      setFilteredDevices(
        allDevices.filter(
          (device) =>
            device.name?.toLowerCase().includes(keyword) ||
            device.serial?.toLowerCase().includes(keyword) ||
            device.id.toString().includes(keyword)
        )
      );
    } else {
      setFilteredDevices(allDevices);
    }
  }, [deviceSearchKeyword, allDevices]);


  const loadCategoryDevices = async (categoryId: number) => {
    setLoadingDevices(true);
    try {
      const response = await api.get(`/devices?cateId=${categoryId}`);
      if (response.data.status) {
        setCategoryDevices(response.data.data || []);
      } else {
        toast.error(response.data.error || 'Lỗi khi tải danh sách thiết bị');
        setCategoryDevices([]);
      }
    } catch (error: any) {
      console.error('Error loading category devices:', error);
      toast.error('Lỗi khi tải danh sách thiết bị');
      setCategoryDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadSelectedDevicesInfo = async () => {
    if (formData.deviceIds.length === 0) {
      setSelectedDevices([]);
      return;
    }

    setLoadingDevices(true);
    try {
      // Load all devices first
      const response = await api.get('/devices?limit=9999');
      if (response.data.status) {
        const allDevs = response.data.data || [];
        const selected = allDevs.filter((device: DeviceVM) =>
          formData.deviceIds.includes(device.id)
        );
        setSelectedDevices(selected);
      }
    } catch (error: any) {
      console.error('Error loading selected devices info:', error);
    } finally {
      setLoadingDevices(false);
    }
  };

  const loadAllDevicesForModal = async () => {
    setLoadingDevices(true);
    try {
      const response = await api.get('/devices?limit=9999');
      if (response.data.status) {
        const devices = response.data.data || [];
        setAllDevices(devices);
        setFilteredDevices(devices);
        // Pre-select devices that are already selected
        const preSelected = devices.filter((device: DeviceVM) =>
          formData.deviceIds.includes(device.id)
        );
        setSelectedDevices(preSelected);
      } else {
        toast.error(response.data.error || 'Lỗi khi tải danh sách thiết bị');
      }
    } catch (error: any) {
      console.error('Error loading devices:', error);
      toast.error('Lỗi khi tải danh sách thiết bị');
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleOpenDeviceModal = () => {
    setShowDeviceModal(true);
    loadAllDevicesForModal(); // loadAllDevicesForModal đã có logic pre-select devices
  };

  const handleDeviceCheckboxChange = (device: DeviceVM) => {
    setSelectedDevices((prev) => {
      const exists = prev.find((d) => d.id === device.id);
      if (exists) {
        return prev.filter((d) => d.id !== device.id);
      } else {
        return [...prev, device];
      }
    });
  };

  const handleSelectAllDevices = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedDevices([...filteredDevices]);
    } else {
      setSelectedDevices([]);
    }
  };

  const handleConfirmDeviceSelection = () => {
    const selectedIds = selectedDevices.map((d) => d.id);
    console.log('Confirming device selection:', { selectedIds, selectedDevices }); // Debug log
    // Sử dụng functional update để đảm bảo state được cập nhật đúng
    setFormData((prev) => {
      const updated = { ...prev, deviceIds: selectedIds };
      console.log('Updated formData:', updated); // Debug log
      return updated;
    });
    setShowDeviceModal(false);
    setDeviceSearchKeyword('');
  };


  const handleQuickViewReport = (reportId: number) => {
    setSelectedQuickReportId(reportId);
    setShowQuickView(true);
  };


  // Group plans by maintenanceBatchId
  const groupedPlans = React.useMemo(() => {
    // Filter plans based on activeTab
    const filteredPlans = activeTab === 'plans'
      ? allPlans.filter(p => p.isActive)
      : activeTab === 'cancelled'
        ? allPlans.filter(p => !p.isActive)
        : allPlans;

    const groups: Record<string, {
      batchId: string;
      title: string;
      plans: DeviceReminderPlanVM[];
      totalDevices: number;
      activeCount: number;
      inactiveCount: number;
      maintenanceType: string | null;
      maintenanceProvider: string | null;
      metadata: Record<string, any> | null;
      canModifyDevices: boolean; // Can add/remove devices if all plans haven't reached due date
      lastMaintenanceDate: Date | null; // Ngày bảo trì lần trước (từ lastCompletedEvent)
      nextMaintenanceDate: Date | null; // Ngày bảo trì sắp đến (từ nextDueDate)
      isCancelledBatch?: boolean; // Indicates if all plans in batch are inactive
      inProgressCount?: number; // Number of currently active events for the batch
      plannedCount?: number; // Number of currently planned events for the batch
      matchedReport?: DamageReportVM | null; // Report that corresponds to 'due' maintenance
    }> = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredPlans.forEach((plan) => {
      const batchId = plan.metadata?.maintenanceBatchId || 'no-batch';
      const title = plan.title || 'Kế hoạch không có tiêu đề';

      if (!groups[batchId]) {
        groups[batchId] = {
          batchId,
          title,
          plans: [],
          totalDevices: 0,
          activeCount: 0,
          inactiveCount: 0,
          maintenanceType: plan.metadata?.maintenanceType || null,
          maintenanceProvider: plan.metadata?.maintenanceProvider || null,
          metadata: plan.metadata || null,
          canModifyDevices: true, // Will be updated below
          lastMaintenanceDate: null,
          nextMaintenanceDate: null,
          isCancelledBatch: false, // Default to false
        };
      }

      groups[batchId].plans.push(plan);
      groups[batchId].totalDevices++;
      if (plan.isActive) {
        groups[batchId].activeCount++;
      } else {
        groups[batchId].inactiveCount++;
      }
    });

    // Determine if a batch is cancelled (all plans are inactive)
    Object.values(groups).forEach(group => {
      // @ts-ignore - Dynamic property for UI
      (group as any).isCancelledBatch = group.totalDevices > 0 && group.activeCount === 0;
    });

    // Tính toán lastMaintenanceDate và nextMaintenanceDate cho mỗi group
    Object.values(groups).forEach((group) => {
      // Tìm ngày bảo trì trước (last completed event) - lấy ngày mới nhất
      const completedDates: Date[] = [];

      group.plans.forEach((plan) => {
        // Lấy từ lastCompletedEvent nếu có
        if (plan.lastCompletedEvent?.endDate) {
          const date = plan.lastCompletedEvent.endDate;
          if (date instanceof Date && !isNaN(date.getTime())) {
            completedDates.push(date);
          } else if (typeof date === 'string') {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
              completedDates.push(parsedDate);
            }
          }
        }

        // Nếu không có lastCompletedEvent, kiểm tra event hiện tại
        const currentEvent = planEvents[plan.id];
        if (currentEvent && currentEvent.status === 'completed' && currentEvent.endDate) {
          const date = currentEvent.endDate;
          if (typeof date === 'string') {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) {
              completedDates.push(parsedDate);
            }
          }
        }
      });

      if (completedDates.length > 0) {
        group.lastMaintenanceDate = completedDates.sort((a, b) => b.getTime() - a.getTime())[0];
      }

      // Tìm ngày bảo trì sắp đến (nextDueDate) - lấy ngày sớm nhất từ các plan đang hoạt động
      const nextDates = group.plans
        .filter(p => p.isActive && p.nextDueDate)
        .map(p => p.nextDueDate)
        .filter((d): d is Date => {
          if (!d) return false;
          if (d instanceof Date && !isNaN(d.getTime())) return true;
          // Nếu là string, thử convert
          if (typeof d === 'string') {
            const date = new Date(d);
            return !isNaN(date.getTime());
          }
          return false;
        })
        .map(d => d instanceof Date ? d : new Date(d));

      if (nextDates.length > 0) {
        group.nextMaintenanceDate = nextDates.sort((a, b) => a.getTime() - b.getTime())[0];
      }
    });

    // Check if can modify devices (all active plans haven't reached due date)
    Object.values(groups).forEach((group) => {
      const activePlans = group.plans.filter(p => p.isActive);
      if (activePlans.length === 0) {
        group.canModifyDevices = false;
      } else {
        // Can modify if all active plans haven't reached due date
        group.canModifyDevices = activePlans.every((plan) => {
          if (!plan.nextDueDate) return false;
          const dueDate = new Date(plan.nextDueDate);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate > today;
        });
      }

      // Compute batch current status based on active events
      let inProgressCount = 0;
      let plannedCount = 0;
      
      activePlans.forEach((plan) => {
        const currentEvent = planEvents[plan.id];
        if (currentEvent) {
          if (currentEvent.status === 'in_progress') inProgressCount++;
          else if (currentEvent.status === 'planned') plannedCount++;
        }
      });
      
      (group as any).inProgressCount = inProgressCount;
      (group as any).plannedCount = plannedCount;

      // Tìm báo cáo phù hợp (reportDate >= nextMaintenanceDate) cho batch này
      if (group.nextMaintenanceDate && group.batchId !== 'no-batch') {
        const nextDate = new Date(group.nextMaintenanceDate);
        nextDate.setHours(0, 0, 0, 0);

        // Tìm các báo cáo liên quan đến batch này
        const relatedReports = maintenanceReports.filter(r => 
          r.maintenanceBatchId && group.batchId && 
          String(r.maintenanceBatchId).toLowerCase() === String(group.batchId).toLowerCase()
        );

        if (relatedReports.length > 0) {
          // Lọc các báo cáo có reportDate >= nextMaintenanceDate
          const matchingReports = relatedReports.filter(r => {
            if (!r.reportDate) return false;
            const rDate = new Date(r.reportDate);
            rDate.setHours(0, 0, 0, 0);
            return rDate.getTime() >= nextDate.getTime();
          }).sort((a, b) => {
            // Lấy báo cáo mới nhất khớp
            return new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime();
          });

          if (matchingReports.length > 0) {
            group.matchedReport = matchingReports[0];
          }
        }
      }
    });

    // Lọc groups dựa trên activeTab
    let finalGroups = Object.values(groups);

    if (activeTab === 'plans') {
      // Chỉ hiển thị groups có ít nhất 1 plan active
      finalGroups = finalGroups.filter(group => group.activeCount > 0);
    } else if (activeTab === 'cancelled') {
      // Chỉ hiển thị groups có ít nhất 1 plan inactive
      finalGroups = finalGroups.filter(group => group.inactiveCount > 0);
    }

    return finalGroups;
  }, [allPlans, activeTab, planEvents, maintenanceReports]);

  const loadBatchDetails = async (batchId: string) => {
    setLoadingBatchDetails(true);
    try {
      const response = await api.get(`/events/batch/${batchId}`);
      if (response.data.status) {
        setBatchEvents(response.data.data || []);
      } else {
        toast.error(response.data.error || 'Lỗi khi tải chi tiết batch');
      }
    } catch (error: any) {
      console.error('Error loading batch details:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi tải chi tiết batch');
    } finally {
      setLoadingBatchDetails(false);
    }
  };

  const loadMaintenanceRounds = async (batchId: string) => {
    setLoadingRounds(true);
    try {
      const response = await api.get(`/maintenance-rounds/${batchId}`);
      if (response.data.status) {
        setMaintenanceRounds(response.data.data || []);
      } else {
        toast.error(response.data.error || 'Lỗi khi tải lịch sử đợt bảo trì');
      }
    } catch (error: any) {
      console.error('Error loading maintenance rounds:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi tải lịch sử đợt bảo trì');
    } finally {
      setLoadingRounds(false);
    }
  };

  const loadRoundDetail = async (batchId: string, roundDate: string) => {
    setLoadingRoundDetail(true);
    try {
      const response = await api.get(`/maintenance-rounds/${batchId}/${roundDate}`);
      if (response.data.status) {
        setRoundDetail(response.data.data);
      } else {
        toast.error(response.data.error || 'Lỗi khi tải chi tiết đợt bảo trì');
      }
    } catch (error: any) {
      console.error('Error loading round detail:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi tải chi tiết đợt bảo trì');
    } finally {
      setLoadingRoundDetail(false);
    }
  };

  const handleViewBatch = (batchId: string, title?: string) => {
    setSelectedBatchId(batchId);
    setSelectedBatchTitle(title || '');
    setShowBatchModal(true);
    setBatchModalTab('events');
    loadBatchDetails(batchId);
    loadMaintenanceRounds(batchId);
  };

  const handleViewRound = (batchId: string, roundDate: string) => {
    setSelectedRound({ batchId, roundDate });
    setShowRoundDetailModal(true);
    loadRoundDetail(batchId, roundDate);
  };

  const handleExportRound = async (batchId: string, roundDate: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/maintenance-rounds/${batchId}/${roundDate}/export`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Try to parse error as JSON
        try {
          const errorData = await response.json();
          toast.error(errorData.error || 'Lỗi khi xuất báo cáo');
        } catch {
          toast.error('Lỗi khi xuất báo cáo');
        }
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao-cao-dot-bao-tri-${batchId}-${roundDate}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Đã xuất báo cáo thành công');
    } catch (error: any) {
      console.error('Error exporting round:', error);
      toast.error('Lỗi khi xuất báo cáo');
    }
  };

  const handleReschedule = async () => {
    if (!selectedPlan || !rescheduleDate || !rescheduleReason.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      const response = await api.post(`/device-reminder-plans/${selectedPlan.id}/reschedule`, {
        newDate: rescheduleDate,
        reason: rescheduleReason.trim(),
      });

      if (response.data.status) {
        toast.success('Đã dời lịch thành công');
        setShowRescheduleModal(false);
        setRescheduleDate('');
        setRescheduleReason('');
        setSelectedPlan(null);
        if (activeTab === 'plans') {
          loadAllPlans();
        } else {
          loadData();
        }
      } else {
        toast.error(response.data.error || 'Lỗi khi dời lịch');
      }
    } catch (error: any) {
      console.error('Error rescheduling:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi dời lịch');
    }
  };

  const handleCancel = async () => {
    if (!selectedPlan || !cancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy');
      return;
    }

    if (!confirm('Bạn có chắc chắn muốn hủy kế hoạch này?')) {
      return;
    }

    try {
      const response = await api.post(`/device-reminder-plans/${selectedPlan.id}/cancel`, {
        reason: cancelReason.trim(),
      });

      if (response.data.status) {
        toast.success('Đã hủy kế hoạch thành công');
        setShowCancelModal(false);
        setCancelReason('');
        setSelectedPlan(null);
        if (activeTab === 'plans') {
          loadAllPlans();
        } else {
          loadData();
        }
      } else {
        toast.error(response.data.error || 'Lỗi khi hủy kế hoạch');
      }
    } catch (error: any) {
      console.error('Error canceling plan:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi hủy kế hoạch');
    }
  };

  const handleDeletePlan = async (planId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa kế hoạch này?')) {
      return;
    }

    try {
      const response = await api.delete(`/device-reminder-plans/${planId}`);
      if (response.data.status) {
        toast.success('Đã xóa kế hoạch thành công');
        loadAllPlans();
      } else {
        toast.error(response.data.error || 'Lỗi khi xóa kế hoạch');
      }
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi xóa kế hoạch');
    }
  };

  const handleBatchUpdate = async () => {
    if (!selectedGroupForInterval || editIntervalValue <= 0) {
      toast.error('Vui lòng nhập chu kỳ hợp lệ');
      return;
    }

    if (!editBatchTitle.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }

    if (!editBatchStartFrom) {
      toast.error('Vui lòng chọn ngày bắt đầu');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn cập nhật thông tin cho tất cả ${selectedGroupForInterval.plans.length} kế hoạch trong nhóm này?`)) {
      return;
    }

    setSavingBatchEdit(true);
    try {
      const plans = selectedGroupForInterval.plans; // Update all plans in batch to keep consistency
      let successCount = 0;
      let errorCount = 0;

      for (const plan of plans) {
        try {
          // Tính toán nextDueDate mới
          let newNextDueDate = plan.nextDueDate ? new Date(plan.nextDueDate) : null;
          
          const intervalChanged = plan.intervalValue !== editIntervalValue || plan.intervalUnit !== editIntervalUnit;
          const startFromChanged = formatDateInput(plan.startFrom || '') !== editBatchStartFrom;
          
          if ((intervalChanged || startFromChanged) && editBatchStartFrom) {
            // Nếu đổi chu kỳ hoặc ngày bắt đầu, tính lại nextDueDate từ startFrom mới 
            // hoặc hoàn thành gần nhất (ưu tiên startFrom mới cho kế hoạch chưa chạy)
            const baseDate = plan.lastCompletedEvent?.endDate 
              ? new Date(plan.lastCompletedEvent.endDate) 
              : new Date(editBatchStartFrom);
            
            newNextDueDate = new Date(baseDate);
            switch (editIntervalUnit) {
              case 'day': newNextDueDate.setDate(newNextDueDate.getDate() + editIntervalValue); break;
              case 'week': newNextDueDate.setDate(newNextDueDate.getDate() + editIntervalValue * 7); break;
              case 'month': newNextDueDate.setMonth(newNextDueDate.getMonth() + editIntervalValue); break;
              case 'year': newNextDueDate.setFullYear(newNextDueDate.getFullYear() + editIntervalValue); break;
            }
          }

          const metadata = {
            ...(plan.metadata || {}),
            maintenanceType: editBatchMaintenanceType,
            maintenanceProvider: editBatchMaintenanceType === 'outsource' ? editBatchProvider : undefined,
            cost: editBatchMaintenanceType === 'outsource' ? editBatchCost : undefined,
          };

          const response = await api.put(`/device-reminder-plans/${plan.id}`, {
            deviceId: plan.deviceId,
            reminderType: plan.reminderType,
            eventTypeId: editBatchEventTypeId || plan.eventTypeId,
            title: editBatchTitle,
            description: editBatchDescription,
            intervalValue: editIntervalValue,
            intervalUnit: editIntervalUnit,
            startFrom: editBatchStartFrom,
            endAt: editBatchEndAt || null,
            nextDueDate: newNextDueDate ? newNextDueDate.toISOString().split('T')[0] : null,
            isActive: plan.isActive,
            metadata: metadata,
          });

          if (response.data.status) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error: any) {
          console.error(`Error updating plan ${plan.id}:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Đã cập nhật thành công cho ${successCount} kế hoạch`);
        if (errorCount > 0) {
          toast.warning(`${errorCount} kế hoạch gặp lỗi khi cập nhật`);
        }
        setShowEditIntervalModal(false);
        setSelectedGroupForInterval(null);
        
        // Refresh all data levels
        loadAllPlans();
        loadData();
      } else {
        toast.error('Không có kế hoạch nào được cập nhật');
      }
    } catch (error: any) {
      console.error('Error updating batch:', error);
      toast.error('Lỗi khi cập nhật kế hoạch');
    } finally {
      setSavingBatchEdit(false);
    }
  };

  // Batch actions
  const handleBatchReschedule = async () => {
    if (!selectedGroup || !batchRescheduleDate || !batchRescheduleReason.trim()) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn dời lịch cho tất cả ${selectedGroup.plans.length} kế hoạch trong nhóm này?`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const plan of selectedGroup.plans) {
        if (!plan.isActive) continue; // Skip inactive plans

        try {
          const response = await api.post(`/device-reminder-plans/${plan.id}/reschedule`, {
            newDate: batchRescheduleDate,
            reason: batchRescheduleReason.trim(),
          });
          if (response.data.status) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(`Error rescheduling plan ${plan.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã dời lịch thành công ${successCount} kế hoạch`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} kế hoạch gặp lỗi khi dời lịch`);
      }

      setShowBatchRescheduleModal(false);
      setBatchRescheduleDate('');
      setBatchRescheduleReason('');
      setSelectedGroup(null);
      loadAllPlans();
    } catch (error: any) {
      console.error('Error batch rescheduling:', error);
      toast.error('Lỗi khi dời lịch hàng loạt');
    }
  };

  const handleBatchCancel = async () => {
    if (!selectedGroup || !batchCancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn hủy tất cả ${selectedGroup.plans.length} kế hoạch trong nhóm này?`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const plan of selectedGroup.plans) {
        if (!plan.isActive) continue; // Skip already inactive plans

        try {
          const response = await api.post(`/device-reminder-plans/${plan.id}/cancel`, {
            reason: batchCancelReason.trim(),
          });
          if (response.data.status) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(`Error canceling plan ${plan.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã hủy thành công ${successCount} kế hoạch`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} kế hoạch gặp lỗi khi hủy`);
      }

      setShowBatchCancelModal(false);
      setBatchCancelReason('');
      setSelectedGroup(null);
      loadAllPlans();
    } catch (error: any) {
      console.error('Error batch canceling:', error);
      toast.error('Lỗi khi hủy hàng loạt');
    }
  };

  const handleBatchComplete = async () => {
    if (!selectedGroup || !batchCompleteDate) {
      toast.error('Vui lòng chọn ngày hoàn thành');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn ghi nhận hoàn thành cho tất cả ${selectedGroup.plans.filter(p => p.isActive).length} kế hoạch đang hoạt động trong nhóm này?`)) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const plan of selectedGroup.plans) {
        if (!plan.isActive) continue; // Skip inactive plans

        try {
          // Check if event already exists
          const existingEvent = planEvents[plan.id];
          let eventId = existingEvent?.id;

          // If event doesn't exist, create it directly with status 'completed'
          if (!eventId) {
            const eventMetadata = {
              ...(plan.metadata || {}),
              maintenanceBatchId: plan.metadata?.maintenanceBatchId || (selectedGroup.batchId !== 'no-batch' ? selectedGroup.batchId : null),
            };
            const eventData = {
              title: plan.title || `Bảo trì - ${plan.deviceName}`,
              deviceId: plan.deviceId,
              eventTypeId: plan.eventTypeId || 0,
              description: plan.description || null,
              status: 'completed',
              eventDate: batchCompleteDate,
              startDate: batchCompleteDate,
              endDate: batchCompleteDate,
              staffId: batchCompleteStaffId || null,
              notes: batchCompleteNotes.trim() || null,
              metadata: eventMetadata,
            };

            const createResponse = await api.post('/events', eventData);
            if (createResponse.data.status) {
              eventId = createResponse.data.data.id;
            } else {
              errorCount++;
              continue;
            }
          } else {
            // Update existing event - cần gửi đầy đủ thông tin bao gồm eventTypeId
            const response = await api.put(`/events/${eventId}`, {
              title: existingEvent.title || plan.title || `Bảo trì - ${plan.deviceName}`,
              deviceId: existingEvent.deviceId || plan.deviceId,
              eventTypeId: existingEvent.eventTypeId || plan.eventTypeId || 0,
              description: existingEvent.description || plan.description || null,
              status: 'completed',
              eventDate: batchCompleteDate,
              startDate: existingEvent.startDate || batchCompleteDate,
              endDate: batchCompleteDate,
              notes: batchCompleteNotes.trim() || '',
              staffId: batchCompleteStaffId || existingEvent.staffId || null,
              metadata: plan.metadata || null,
            });

            if (!response.data.status) {
              errorCount++;
              continue;
            }
          }

          // Update plan's nextDueDate based on completion date
          if (plan.intervalValue && plan.intervalUnit) {
            const completionDate = new Date(batchCompleteDate);
            completionDate.setHours(0, 0, 0, 0);

            // Calculate next due date from completion date
            const nextDueDate = new Date(completionDate);
            if (plan.intervalUnit === 'day') {
              nextDueDate.setDate(nextDueDate.getDate() + plan.intervalValue);
            } else if (plan.intervalUnit === 'week') {
              nextDueDate.setDate(nextDueDate.getDate() + plan.intervalValue * 7);
            } else if (plan.intervalUnit === 'month') {
              nextDueDate.setMonth(nextDueDate.getMonth() + plan.intervalValue);
            } else if (plan.intervalUnit === 'year') {
              nextDueDate.setFullYear(nextDueDate.getFullYear() + plan.intervalValue);
            }

            // Update plan's nextDueDate
            try {
              await api.put(`/device-reminder-plans/${plan.id}`, {
                deviceId: plan.deviceId,
                reminderType: plan.reminderType,
                eventTypeId: plan.eventTypeId,
                title: plan.title,
                description: plan.description,
                intervalValue: plan.intervalValue,
                intervalUnit: plan.intervalUnit,
                startFrom: plan.startFrom ? formatDateInput(plan.startFrom) : null,
                endAt: plan.endAt ? formatDateInput(plan.endAt) : null,
                nextDueDate: formatDateInput(nextDueDate),
                isActive: plan.isActive,
                metadata: plan.metadata,
              });
            } catch (error) {
              console.error(`Error updating plan ${plan.id} nextDueDate:`, error);
            }
          }

          successCount++;
        } catch (error: any) {
          errorCount++;
          console.error(`Error completing plan ${plan.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã ghi nhận hoàn thành thành công ${successCount} kế hoạch`);

        // Cập nhật nextDueDate trong state local ngay lập tức để ẩn nút "Đã xong"
        if (selectedGroup) {
          setAllPlans(prevPlans => {
            return prevPlans.map(plan => {
              // Tìm plan trong batch đã hoàn thành
              const planInBatch = selectedGroup.plans.find(p => p.id === plan.id);
              if (planInBatch && plan.isActive && plan.intervalValue && plan.intervalUnit) {
                const completionDate = new Date(batchCompleteDate);
                completionDate.setHours(0, 0, 0, 0);

                // Tính toán nextDueDate mới
                const nextDueDate = new Date(completionDate);
                if (plan.intervalUnit === 'day') {
                  nextDueDate.setDate(nextDueDate.getDate() + plan.intervalValue);
                } else if (plan.intervalUnit === 'week') {
                  nextDueDate.setDate(nextDueDate.getDate() + plan.intervalValue * 7);
                } else if (plan.intervalUnit === 'month') {
                  nextDueDate.setMonth(nextDueDate.getMonth() + plan.intervalValue);
                } else if (plan.intervalUnit === 'year') {
                  nextDueDate.setFullYear(nextDueDate.getFullYear() + plan.intervalValue);
                }

                return {
                  ...plan,
                  nextDueDate: nextDueDate,
                };
              }
              return plan;
            });
          });
        }
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} kế hoạch gặp lỗi khi ghi nhận hoàn thành`);
      }

      setShowBatchCompleteModal(false);
      setBatchCompleteDate('');
      setBatchCompleteNotes('');
      setBatchCompleteStaffId(null);
      setSelectedGroup(null);
      loadAllPlans();
      if (selectedBatchId) {
        loadBatchDetails(selectedBatchId);
        loadMaintenanceRounds(selectedBatchId);
      }
    } catch (error: any) {
      console.error('Error batch completing:', error);
      toast.error('Lỗi khi ghi nhận hoàn thành hàng loạt');
    }
  };

  const handleOpenEditBatch = async (batchId: string, title: string) => {
    let plansInBatch = allPlans.filter(p => p.metadata?.maintenanceBatchId === batchId);
    
    if (plansInBatch.length === 0) {
      setLoading(true);
      try {
        const response = await api.get('/device-reminder-plans');
        if (response.data.status) {
          const plans = response.data.data || [];
          setAllPlans(plans);
          plansInBatch = plans.filter((p: any) => p.metadata?.maintenanceBatchId === batchId);
        }
      } catch (err) {
        console.error('Error loading plans for edit:', err);
      } finally {
        setLoading(false);
      }
    }
    
    if (plansInBatch.length === 0) {
      toast.error('Vui lòng vào tab "Đang Hoạt Động" để có thể chỉnh sửa chi tiết các kế hoạch');
      return;
    }
    
    const firstPlan = plansInBatch[0];
    setSelectedGroupForInterval({
      batchId: batchId,
      title: title,
      plans: plansInBatch,
      metadata: firstPlan.metadata
    });
    
    setEditBatchTitle(getShortTitle(title));
    setEditBatchDescription(firstPlan.description || '');
    setEditIntervalValue(firstPlan.intervalValue || 6);
    setEditIntervalUnit((firstPlan.intervalUnit as any) || 'month');
    setEditBatchStartFrom(firstPlan.startFrom ? formatDateInput(firstPlan.startFrom) : '');
    setEditBatchEndAt(firstPlan.endAt ? formatDateInput(firstPlan.endAt) : '');
    setEditBatchMaintenanceType(firstPlan.metadata?.maintenanceType || 'internal');
    setEditBatchProvider(firstPlan.metadata?.maintenanceProvider || '');
    setEditBatchCost(firstPlan.metadata?.cost || 0);

    // Mặc định sử dụng eventTypeId của bản ghi cũ, nếu không có thì tìm ID Bảo trì
    let eventTypeId = firstPlan.eventTypeId || 0;
    if (eventTypeId === 0) {
      const maintenanceType = eventTypes.find((t: any) => 
        t.name.toLowerCase().includes('bảo trì') || 
        t.name.toLowerCase() === 'maintenance'
      );
      if (maintenanceType) {
        eventTypeId = maintenanceType.id;
      }
    }
    setEditBatchEventTypeId(eventTypeId);
    
    setShowEditIntervalModal(true);
  };

  const handleBatchDelete = async (group: { batchId: string; title: string; plans: DeviceReminderPlanVM[] }) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tất cả ${group.plans.length} kế hoạch trong nhóm "${group.title}"?`)) {
      return;
    }

    if (!confirm('Hành động này không thể hoàn tác. Bạn có chắc chắn?')) {
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const plan of group.plans) {
        try {
          const response = await api.delete(`/device-reminder-plans/${plan.id}`);
          if (response.data.status) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(`Error deleting plan ${plan.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã xóa thành công ${successCount} kế hoạch`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} kế hoạch gặp lỗi khi xóa`);
      }

      loadAllPlans();
    } catch (error: any) {
      console.error('Error batch deleting:', error);
      toast.error('Lỗi khi xóa hàng loạt');
    }
  };

  const handleAddDevices = async () => {
    if (!selectedGroupForDevices || devicesToAdd.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thiết bị');
      return;
    }

    try {
      const firstPlan = selectedGroupForDevices.plans[0];
      if (!firstPlan) {
        toast.error('Không tìm thấy thông tin kế hoạch');
        return;
      }

      // Get the earliest nextDueDate from active plans as the new nextDueDate
      const activePlans = selectedGroupForDevices.plans.filter(p => p.isActive && p.nextDueDate);
      const earliestDate = activePlans.length > 0
        ? activePlans
          .map(p => p.nextDueDate ? new Date(p.nextDueDate) : null)
          .filter(d => d !== null)
          .sort((a, b) => (a?.getTime() || 0) - (b?.getTime() || 0))[0]
        : new Date();

      if (!earliestDate) {
        toast.error('Không thể xác định ngày đến hạn');
        return;
      }

      // Filter out devices that already have plans in this group
      const existingDeviceIds = selectedGroupForDevices.plans.map(p => p.deviceId);
      const newDevices = devicesToAdd.filter(d => !existingDeviceIds.includes(d.id));

      if (newDevices.length === 0) {
        toast.warning('Tất cả thiết bị đã có trong kế hoạch này');
        setShowAddDevicesModal(false);
        setDevicesToAdd([]);
        setSelectedGroupForDevices(null);
        return;
      }

      let successCount = 0;
      let errorCount = 0;

      for (const device of newDevices) {
        try {
          const plan: any = {
            deviceId: device.id,
            reminderType: firstPlan.reminderType || 'maintenance',
            eventTypeId: firstPlan.eventTypeId,
            title: firstPlan.title || `Bảo trì định kỳ - ${device.name}`,
            description: firstPlan.description || null,
            intervalValue: firstPlan.intervalValue,
            intervalUnit: firstPlan.intervalUnit,
            cronExpression: null,
            startFrom: firstPlan.startFrom || new Date(),
            endAt: firstPlan.endAt || null,
            nextDueDate: earliestDate,
            lastTriggeredAt: null,
            isActive: true,
            metadata: selectedGroupForDevices.metadata || {},
            createdBy: null, // Will be set by API
            createdAt: new Date(),
            updatedBy: null,
            updatedAt: new Date(),
          };

          const response = await api.post('/device-reminder-plans', plan);
          if (response.data.status) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(`Error adding device ${device.id}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã thêm ${successCount} thiết bị vào kế hoạch`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} thiết bị gặp lỗi khi thêm`);
      }

      setShowAddDevicesModal(false);
      setDevicesToAdd([]);
      setSelectedGroupForDevices(null);
      loadAllPlans();
    } catch (error: any) {
      console.error('Error adding devices:', error);
      toast.error('Lỗi khi thêm thiết bị');
    }
  };

  const loadStaffList = async () => {
    try {
      const response = await api.get('/staff?departmentId=0');
      if (response.data.status) {
        setStaffList((response.data.data || []).map((s: any) => ({
          id: s.id,
          name: s.name || `Nhân viên #${s.id}`,
        })));
      }
    } catch (error: any) {
      console.error('Error loading staff:', error);
    }
  };

  const handleStartMaintenance = async () => {
    if (!selectedEvent) {
      toast.error('Không tìm thấy sự kiện');
      return;
    }

    try {
      const response = await api.put(`/events/${selectedEvent.id}`, {
        status: 'in_progress',
        startDate: formatDateInput(new Date()),
        notes: startNotes.trim() || null,
        staffId: startStaffId || null,
      });

      if (response.data.status) {
        toast.success('Đã bắt đầu bảo trì');
        setShowStartModal(false);
        setSelectedEvent(null);
        setStartNotes('');
        setStartStaffId(null);

        // Reload data
        if (selectedBatchId) {
          loadBatchDetails(selectedBatchId);
        }
        if (activeTab === 'plans') {
          loadAllPlans();
        }
      } else {
        toast.error(response.data.error || 'Lỗi khi cập nhật trạng thái');
      }
    } catch (error: any) {
      console.error('Error starting maintenance:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleCompleteMaintenance = async () => {
    if (!selectedEvent || !completeDate) {
      toast.error('Vui lòng chọn ngày hoàn thành');
      return;
    }

    try {
      let eventId = selectedEvent.id;

      // If event doesn't exist yet (id = 0), create it directly with status 'completed'
      if (eventId === 0 && selectedPlan) {
        const eventData = {
          title: selectedEvent.title || selectedPlan.title || `Bảo trì - ${selectedEvent.deviceName}`,
          deviceId: selectedEvent.deviceId,
          eventTypeId: selectedEvent.eventTypeId,
          description: selectedEvent.description || selectedPlan.description || null,
          status: 'completed',
          eventDate: completeDate,
          startDate: completeDate,
          endDate: completeDate,
          staffId: completeStaffId || null,
          notes: completeNotes.trim() || null,
          metadata: selectedPlan.metadata || {},
        };

        const createResponse = await api.post('/events', eventData);
        if (!createResponse.data.status) {
          toast.error('Lỗi khi tạo event');
          return;
        }
        eventId = createResponse.data.data.id;
      } else {
        // Update existing event
        const response = await api.put(`/events/${eventId}`, {
          status: 'completed',
          endDate: completeDate,
          notes: completeNotes.trim() || null,
          staffId: completeStaffId || null,
        });

        if (!response.data.status) {
          toast.error(response.data.error || 'Lỗi khi cập nhật trạng thái');
          return;
        }
      }

      // Update plan's nextDueDate if this is a new completion
      if (selectedPlan && selectedPlan.intervalValue && selectedPlan.intervalUnit) {
        const completionDate = new Date(completeDate);
        completionDate.setHours(0, 0, 0, 0);

        // Calculate next due date from completion date
        const nextDueDate = new Date(completionDate);
        if (selectedPlan.intervalUnit === 'day') {
          nextDueDate.setDate(nextDueDate.getDate() + selectedPlan.intervalValue);
        } else if (selectedPlan.intervalUnit === 'week') {
          nextDueDate.setDate(nextDueDate.getDate() + selectedPlan.intervalValue * 7);
        } else if (selectedPlan.intervalUnit === 'month') {
          nextDueDate.setMonth(nextDueDate.getMonth() + selectedPlan.intervalValue);
        } else if (selectedPlan.intervalUnit === 'year') {
          nextDueDate.setFullYear(nextDueDate.getFullYear() + selectedPlan.intervalValue);
        }

        // Update plan's nextDueDate
        try {
          await api.put(`/device-reminder-plans/${selectedPlan.id}`, {
            deviceId: selectedPlan.deviceId,
            reminderType: selectedPlan.reminderType,
            eventTypeId: selectedPlan.eventTypeId,
            title: selectedPlan.title,
            description: selectedPlan.description,
            intervalValue: selectedPlan.intervalValue,
            intervalUnit: selectedPlan.intervalUnit,
            startFrom: selectedPlan.startFrom ? formatDateInput(selectedPlan.startFrom) : null,
            endAt: selectedPlan.endAt ? formatDateInput(selectedPlan.endAt) : null,
            nextDueDate: formatDateInput(nextDueDate),
            isActive: selectedPlan.isActive,
            metadata: selectedPlan.metadata,
          });
        } catch (error) {
          console.error('Error updating plan nextDueDate:', error);
        }
      }

      toast.success('Đã ghi nhận bảo trì hoàn thành');
      setShowCompleteModal(false);
      setSelectedEvent(null);
      setSelectedPlan(null);
      setCompleteDate('');
      setCompleteNotes('');
      setCompleteStaffId(null);

      // Reload data
      if (selectedBatchId) {
        loadBatchDetails(selectedBatchId);
        loadMaintenanceRounds(selectedBatchId);
      }
      if (activeTab === 'plans') {
        loadAllPlans();
      }
    } catch (error: any) {
      console.error('Error completing maintenance:', error);
      toast.error(error.response?.data?.error || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const handleRemoveDevices = async () => {
    if (!selectedGroupForDevices || devicesToRemove.length === 0) {
      toast.error('Vui lòng chọn ít nhất một thiết bị');
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa ${devicesToRemove.length} thiết bị khỏi kế hoạch này?`)) {
      return;
    }

    try {
      const deviceIdsToRemove = devicesToRemove.map(d => d.id);
      const plansToRemove = selectedGroupForDevices.plans.filter(p =>
        deviceIdsToRemove.includes(p.deviceId)
      );

      let successCount = 0;
      let errorCount = 0;

      for (const plan of plansToRemove) {
        try {
          const response = await api.delete(`/device-reminder-plans/${plan.id}`);
          if (response.data.status) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error: any) {
          errorCount++;
          console.error(`Error removing device ${plan.deviceId}:`, error);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã xóa ${successCount} thiết bị khỏi kế hoạch`);
      }
      if (errorCount > 0) {
        toast.warning(`${errorCount} thiết bị gặp lỗi khi xóa`);
      }

      setShowRemoveDevicesModal(false);
      setDevicesToRemove([]);
      setSelectedGroupForDevices(null);
      loadAllPlans();
    } catch (error: any) {
      console.error('Error removing devices:', error);
      toast.error('Lỗi khi xóa thiết bị');
    }
  };

  const getDaysUntilDueColor = (days: number | null): string => {
    if (days === null) return 'text-secondary';
    if (days <= 3) return 'text-danger';
    if (days <= 7) return 'text-warning';
    return 'text-success';
  };

  const getProgressColor = (percent: number, isCancelled: boolean = false) => {
    if (isCancelled) return 'bg-secondary';
    if (percent === 100) return 'bg-success';
    if (percent >= 50) return 'bg-info';
    return 'bg-warning';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.eventTypeId || formData.eventTypeId <= 0) {
      toast.error('Vui lòng chọn loại sự kiện');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Vui lòng nhập tiêu đề');
      return;
    }

    if (!formData.intervalValue || formData.intervalValue <= 0) {
      toast.error('Vui lòng nhập khoảng thời gian hợp lệ');
      return;
    }

    if (!formData.startFrom) {
      toast.error('Vui lòng chọn ngày bắt đầu');
      return;
    }

    // Check selection type
    if (formData.selectionType === 'category' && formData.categoryId <= 0) {
      toast.error('Vui lòng chọn danh mục thiết bị');
      return;
    }

    if (formData.selectionType === 'devices') {
      console.log('Validating devices:', { deviceIds: formData.deviceIds, length: formData.deviceIds?.length }); // Debug log
      if (!formData.deviceIds || !Array.isArray(formData.deviceIds) || formData.deviceIds.length === 0) {
        toast.error('Vui lòng chọn ít nhất một thiết bị');
        return;
      }
    }

    if (formData.maintenanceType === 'outsource' && !formData.maintenanceProvider.trim()) {
      toast.error('Vui lòng nhập nhà cung cấp');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        eventTypeId: formData.eventTypeId,
        title: getShortTitle(formData.title.trim()),
        description: formData.description.trim() || undefined,
        intervalValue: formData.intervalValue,
        intervalUnit: formData.intervalUnit,
        startFrom: formData.startFrom,
        metadata: {
          maintenanceType: formData.maintenanceType,
        },
      };

      // Add selection criteria
      if (formData.selectionType === 'category') {
        payload.categoryId = formData.categoryId;
      } else {
        // Đảm bảo deviceIds là array và không rỗng
        if (!formData.deviceIds || !Array.isArray(formData.deviceIds) || formData.deviceIds.length === 0) {
          toast.error('Vui lòng chọn ít nhất một thiết bị');
          setSubmitting(false);
          return;
        }
        payload.deviceIds = formData.deviceIds;
      }

      // Add end date if provided
      if (formData.endAt) {
        payload.endAt = formData.endAt;
      }

      // Add metadata
      if (formData.maintenanceType === 'outsource') {
        payload.metadata.maintenanceProvider = formData.maintenanceProvider.trim();
        if (formData.cost > 0) {
          payload.metadata.cost = formData.cost;
        }
      }

      console.log('Submitting payload:', payload); // Debug log
      const response = await api.post('/device-reminder-plans/bulk', payload);

      if (response.data.status) {
        toast.success(`Đã tạo ${response.data.data.created} kế hoạch bảo trì thành công!`);
        // Reset form
        setFormData({
          selectionType: 'category',
          categoryId: 0,
          deviceIds: [],
          eventTypeId: 0,
          title: '',
          description: '',
          intervalValue: 6,
          intervalUnit: 'month',
          startFrom: formatDateInput(new Date()),
          endAt: '',
          maintenanceType: 'internal',
          maintenanceProvider: '',
          cost: 0,
        });
        // Reload batches
        if (activeTab === 'batches') {
          loadData();
        } else {
          setActiveTab('batches');
        }
      } else {
        toast.error(response.data.error || 'Lỗi khi tạo kế hoạch');
      }
    } catch (error: any) {
      console.error('Error creating maintenance plan:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Lỗi khi tạo kế hoạch bảo trì';
      console.error('Error details:', {
        message: errorMessage,
        response: error.response?.data,
        status: error.response?.status,
      });
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <h4 className="mb-0 d-flex align-items-center" style={{ fontSize: '1.25rem' }}>
            <i className="fas fa-wrench me-2 text-primary"></i>
            Quản Lý Bảo Trì
          </h4>
          <button
            className="btn btn-white btn-sm border rounded-circle d-flex align-items-center justify-content-center"
            style={{ width: '32px', height: '32px' }}
            onClick={() => {
              loadData();
              toast.success('Đã tải lại dữ liệu');
            }}
            title="Tải lại dữ liệu"
            id="reload-maintenance-btn"
          >
            <i className="fas fa-sync-alt" style={{ fontSize: '0.8rem' }}></i>
          </button>
        </div>

        {/* Tabs - compact pill style */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button
            className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 ${activeTab === 'create' ? 'btn-primary shadow-sm' : 'btn-outline-secondary'}`}
            style={{ fontSize: '0.8rem', fontWeight: activeTab === 'create' ? 600 : 400 }}
            onClick={() => setActiveTab('create')}
          >
            <i className="fas fa-plus-circle"></i>
            <span className="d-none d-sm-inline">Tạo Kế Hoạch</span>
            <span className="d-sm-none">Tạo</span>
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 ${activeTab === 'batches' ? 'btn-primary shadow-sm' : 'btn-outline-secondary'}`}
            style={{ fontSize: '0.8rem', fontWeight: activeTab === 'batches' ? 600 : 400 }}
            onClick={() => setActiveTab('batches')}
          >
            <i className="fas fa-layer-group"></i>
            <span className="d-none d-sm-inline">Batch Bảo Trì</span>
            <span className="d-sm-none">Batch</span>
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 ${activeTab === 'plans' ? 'btn-primary shadow-sm' : 'btn-outline-secondary'}`}
            style={{ fontSize: '0.8rem', fontWeight: activeTab === 'plans' ? 600 : 400 }}
            onClick={() => setActiveTab('plans')}
          >
            <i className="fas fa-list-alt"></i>
            <span className="d-none d-sm-inline">Đang Hoạt Động</span>
            <span className="d-sm-none">Hoạt động</span>
          </button>
          <button
            className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 ${activeTab === 'cancelled' ? 'btn-danger shadow-sm' : 'btn-outline-secondary'}`}
            style={{ fontSize: '0.8rem', fontWeight: activeTab === 'cancelled' ? 600 : 400 }}
            onClick={() => setActiveTab('cancelled')}
          >
            <i className="fas fa-ban"></i>
            <span className="d-none d-sm-inline">Đã Hủy</span>
            <span className="d-sm-none">Đã Hủy</span>
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Đang tải...</span>
            </div>
          </div>
        ) : activeTab === 'create' ? (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="fas fa-plus-circle me-2"></i>
                Tạo Kế Hoạch Bảo Trì Mới
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                {/* Selection Type */}
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label">Chọn thiết bị theo:</label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="selectionType"
                        id="selectionCategory"
                        checked={formData.selectionType === 'category'}
                        onChange={() => setFormData({ ...formData, selectionType: 'category' })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="selectionCategory">
                        Danh mục
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="selectionType"
                        id="selectionDevices"
                        checked={formData.selectionType === 'devices'}
                        onChange={() => setFormData({ ...formData, selectionType: 'devices' })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="selectionDevices">
                        Danh sách thiết bị
                      </label>
                    </div>
                  </div>
                </div>

                {/* Selection Field */}
                {formData.selectionType === 'category' && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-12">
                        <label className="form-label">Danh mục thiết bị <span className="text-danger">*</span></label>
                        <select
                          className="form-select"
                          value={formData.categoryId}
                          onChange={(e) => setFormData({ ...formData, categoryId: parseInt(e.target.value) })}
                          required
                        >
                          <option value="0">-- Chọn danh mục --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Show devices in selected category */}
                    {formData.categoryId > 0 && (
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <label className="form-label">Danh sách thiết bị trong danh mục:</label>
                          {loadingDevices ? (
                            <div className="text-center py-3">
                              <div className="spinner-border spinner-border-sm text-primary" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                              </div>
                            </div>
                          ) : categoryDevices.length > 0 ? (
                            <div className="card">
                              <div className="card-body">
                                <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                  <table className="table table-sm table-hover mb-0">
                                    <thead className="table-light sticky-top">
                                      <tr>
                                        <th style={{ width: '50px' }}>ID</th>
                                        <th>Tên thiết bị</th>
                                        <th>Serial</th>
                                        <th>Phòng ban</th>
                                        <th>Trạng thái</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {categoryDevices.map((device) => (
                                        <tr key={device.id}>
                                          <td>{device.id}</td>
                                          <td>{device.name || '-'}</td>
                                          <td>{device.serial || '-'}</td>
                                          <td>{device.departmentName || '-'}</td>
                                          <td>
                                            {device.status === 1 && <span className="badge bg-success">Đang sử dụng</span>}
                                            {device.status === 2 && <span className="badge bg-warning">Đang sửa chữa</span>}
                                            {device.status === 3 && <span className="badge bg-danger">Hư hỏng</span>}
                                            {device.status === 4 && <span className="badge bg-secondary">Đã thanh lý</span>}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="mt-2 text-muted small">
                                  Tổng cộng: <strong>{categoryDevices.length}</strong> thiết bị
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="alert alert-info mb-0">
                              <i className="fas fa-info-circle me-2"></i>
                              Không có thiết bị nào trong danh mục này
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {formData.selectionType === 'devices' && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-12">
                        <label className="form-label">Chọn thiết bị <span className="text-danger">*</span></label>
                        <div>
                          <button
                            type="button"
                            className="btn btn-outline-primary"
                            onClick={handleOpenDeviceModal}
                          >
                            <i className="fas fa-search me-2"></i>
                            Tìm kiếm và chọn thiết bị
                          </button>
                          {formData.deviceIds.length > 0 && (
                            <span className="ms-3 text-muted">
                              Đã chọn: <strong>{formData.deviceIds.length}</strong> thiết bị
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Show selected devices */}
                    {selectedDevices.length > 0 && (
                      <div className="row mb-3">
                        <div className="col-md-12">
                          <label className="form-label">Danh sách thiết bị đã chọn:</label>
                          <div className="card">
                            <div className="card-body">
                              <div className="table-responsive" style={{ maxHeight: '300px' }}>
                                <table className="table table-sm table-hover mb-0">
                                  <thead className="table-light sticky-top">
                                    <tr>
                                      <th style={{ width: '50px' }}>ID</th>
                                      <th>Tên thiết bị</th>
                                      <th>Serial</th>
                                      <th>Danh mục</th>
                                      <th>Phòng ban</th>
                                      <th>Trạng thái</th>
                                      <th style={{ width: '80px' }}>Thao tác</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {selectedDevices.map((device) => (
                                      <tr key={device.id}>
                                        <td>{device.id}</td>
                                        <td>{device.name || '-'}</td>
                                        <td>{device.serial || '-'}</td>
                                        <td>{device.deviceCategoryName || '-'}</td>
                                        <td>{device.departmentName || '-'}</td>
                                        <td>
                                          {device.status === 1 && <span className="badge bg-success">Đang sử dụng</span>}
                                          {device.status === 2 && <span className="badge bg-warning">Đang sửa chữa</span>}
                                          {device.status === 3 && <span className="badge bg-danger">Hư hỏng</span>}
                                          {device.status === 4 && <span className="badge bg-secondary">Đã thanh lý</span>}
                                        </td>
                                        <td>
                                          <button
                                            type="button"
                                            className="btn btn-sm btn-outline-danger"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              // Remove device from both deviceIds and selectedDevices
                                              const deviceIdToRemove = device.id;
                                              const newIds = formData.deviceIds.filter((id) => id !== deviceIdToRemove);
                                              const newSelectedDevices = selectedDevices.filter((d) => d.id !== deviceIdToRemove);

                                              // Update both states
                                              setFormData((prev) => ({ ...prev, deviceIds: newIds }));
                                              setSelectedDevices(newSelectedDevices);
                                            }}
                                            title="Xóa"
                                          >
                                            <i className="fas fa-times"></i>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Loại sự kiện - Ẩn theo yêu cầu người dùng چون mặc định là Bảo trì */}
                <div className="row mb-3 d-none">
                  <div className="col-md-12">
                    <label className="form-label">Loại sự kiện <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={formData.eventTypeId}
                      onChange={(e) => setFormData({ ...formData, eventTypeId: parseInt(e.target.value) })}
                      required
                    >
                      <option value="0">-- Chọn loại sự kiện --</option>
                      {eventTypes.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Title */}
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label">Tiêu đề <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ví dụ: Bảo trì định kỳ máy lạnh"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label">Mô tả</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Mô tả chi tiết về kế hoạch bảo trì"
                    />
                  </div>
                </div>

                {/* Interval */}
                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Khoảng thời gian <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      value={formData.intervalValue}
                      onChange={(e) => setFormData({ ...formData, intervalValue: parseInt(e.target.value) || 0 })}
                      min="1"
                      required
                    />
                  </div>
                  <div className="col-md-8">
                    <label className="form-label">Đơn vị <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={formData.intervalUnit}
                      onChange={(e) => setFormData({ ...formData, intervalUnit: e.target.value as any })}
                      required
                    >
                      <option value="day">Ngày</option>
                      <option value="week">Tuần</option>
                      <option value="month">Tháng</option>
                      <option value="year">Năm</option>
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Ngày bắt đầu <span className="text-danger">*</span></label>
                    <DateInput
                      value={formData.startFrom}
                      onChange={(value) => setFormData({ ...formData, startFrom: value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Ngày kết thúc (tùy chọn)</label>
                    <DateInput
                      value={formData.endAt}
                      onChange={(value) => setFormData({ ...formData, endAt: value })}
                    />
                  </div>
                </div>

                {/* Maintenance Type */}
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label className="form-label">Loại bảo trì <span className="text-danger">*</span></label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="maintenanceType"
                        id="maintenanceInternal"
                        checked={formData.maintenanceType === 'internal'}
                        onChange={() => setFormData({ ...formData, maintenanceType: 'internal', maintenanceProvider: '' })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="maintenanceInternal">
                        Nội bộ
                      </label>

                      <input
                        type="radio"
                        className="btn-check"
                        name="maintenanceType"
                        id="maintenanceOutsource"
                        checked={formData.maintenanceType === 'outsource'}
                        onChange={() => setFormData({ ...formData, maintenanceType: 'outsource' })}
                      />
                      <label className="btn btn-outline-primary" htmlFor="maintenanceOutsource">
                        Thuê ngoài
                      </label>
                    </div>
                  </div>
                </div>

                {/* Outsource Fields */}
                {formData.maintenanceType === 'outsource' && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-12">
                        <label className="form-label">Nhà cung cấp <span className="text-danger">*</span></label>
                        <input
                          type="text"
                          className="form-control"
                          value={formData.maintenanceProvider}
                          onChange={(e) => setFormData({ ...formData, maintenanceProvider: e.target.value })}
                          placeholder="Tên công ty/nhà cung cấp"
                          required={formData.maintenanceType === 'outsource'}
                        />
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-12">
                        <label className="form-label">Chi phí dự kiến (VNĐ)</label>
                        <input
                          type="number"
                          className="form-control"
                          value={formData.cost || ''}
                          onChange={(e) => setFormData({ ...formData, cost: parseInt(e.target.value) || 0 })}
                          placeholder="0"
                          min="0"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <div className="row">
                  <div className="col-md-12">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Đang tạo...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Tạo Kế Hoạch
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : activeTab === 'batches' ? (
          <div>
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="fas fa-layer-group me-2"></i>
                  Danh Sách Batch Bảo Trì
                </h5>
              </div>
              <div className="card-body">
                {batches.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-inbox fa-3x mb-3"></i>
                    <p>Chưa có batch bảo trì nào</p>
                  </div>
                ) : (
                  <div className="row">
                    {batches.map((batch) => (
                      <div key={batch.batchId} className="col-md-6 col-lg-4 mb-4">
                        <div className={`card h-100 ${batch.isCancelled ? 'border-danger border-opacity-25' : ''}`}>
                          <div className={`card-header d-flex justify-content-between align-items-center ${batch.isCancelled ? 'bg-danger bg-opacity-10 text-danger' : ''}`}>
                            <div className="text-truncate" style={{ maxWidth: '90%' }}>
                              <h6 className="mb-0 text-truncate" title={`${batch.title}${batch.batchId ? ` (${batch.batchId})` : ''}`}>
                                {getShortTitle(batch.title)}
                              </h6>
                            </div>
                            <div className="d-flex align-items-center gap-1">
                              {batch.inProgress > 0 && <span className="badge bg-primary small fw-normal"><i className="fas fa-tools me-1"></i>{batch.inProgress} đang BT</span>}
                              {batch.isCancelled && <span className="badge bg-danger shadow-sm">ĐÃ HỦY</span>}
                            </div>
                          </div>
                          <div className="card-body">
                            <div className="mb-3">
                              <div className="d-flex justify-content-between mb-2">
                                <span>Tiến độ:</span>
                                <div
                                  className={`progress-bar ${getProgressColor(batch.progressPercentage, batch.isCancelled)}`}
                                  role="progressbar"
                                  style={{ width: `${batch.progressPercentage}%` }}
                                  aria-valuenow={batch.progressPercentage}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                >
                                  {batch.progressPercentage}%
                                </div>
                              </div>
                            </div>
                            <div className="row text-center">
                              <div className="col-3 mb-2">
                                <div className="text-muted small">Tổng</div>
                                <div className="fw-bold">{batch.totalDevices}</div>
                              </div>
                              <div className="col-3 mb-2">
                                <div className="text-muted small">Chưa hủy</div>
                                <div className="fw-bold text-dark">{batch.activePlansCount || 0}</div>
                              </div>
                              <div className="col-3 mb-2">
                                <div className="text-muted small">Đang BT</div>
                                <div className="fw-bold text-primary">{batch.inProgress || 0}</div>
                              </div>
                              <div className="col-3 mb-2">
                                <div className="text-muted small">Xong</div>
                                <div className="fw-bold text-success">{batch.completed}</div>
                              </div>
                            </div>
                          </div>
                          <div className="card-footer d-flex gap-2">
                            <button
                              className="btn btn-sm btn-outline-primary flex-grow-1"
                              onClick={() => handleViewBatch(batch.batchId, batch.title)}
                            >
                              <i className="fas fa-eye me-2"></i>
                              Chi Tiết
                            </button>
                            <button
                              className="btn btn-sm btn-outline-info"
                              onClick={() => handleOpenEditBatch(batch.batchId, batch.title)}
                              title="Sửa kế hoạch"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'plans' || activeTab === 'cancelled' ? (
          <div>
            <div className="card">
              <div className="card-header py-2 px-3">
                <h6 className="mb-0 text-truncate" style={{ fontSize: '0.85rem' }}>
                  <i className={`fas ${activeTab === 'plans' ? 'fa-list-alt' : 'fa-ban'} me-2`}></i>
                  {activeTab === 'plans' ? 'Batch Đang Hoạt Động' : 'Batch Đã Hủy'}
                </h6>
              </div>
              <div className="card-body">
                {allPlans.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-inbox fa-3x mb-3"></i>
                    <p>Chưa có kế hoạch bảo trì nào</p>
                  </div>
                ) : groupedPlans.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                    <i className="fas fa-inbox fa-3x mb-3"></i>
                    <p>{activeTab === 'plans' ? 'Không có batch đang hoạt động' : 'Không có batch đã hủy'}</p>
                  </div>
                ) : (
                  <div className="accordion" id="plansAccordion">
                    {groupedPlans.map((group, groupIndex) => {
                      const collapseId = `collapse-${group.batchId}`;
                      const isExpanded = expandedGroups.has(group.batchId);

                      const toggleGroup = () => {
                        setExpandedGroups((prev) => {
                          const newSet = new Set(prev);
                          if (newSet.has(group.batchId)) {
                            newSet.delete(group.batchId);
                          } else {
                            newSet.add(group.batchId);
                          }
                          return newSet;
                        });
                      };

                      // Tính toán màu sắc cho header dựa trên ngày đến hạn
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      let headerBgClass = '';
                      if (group.nextMaintenanceDate) {
                        const nextDate = new Date(group.nextMaintenanceDate);
                        nextDate.setHours(0, 0, 0, 0);
                        const daysUntilDue = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                        if (daysUntilDue < 0) {
                          // Quá hạn - màu đỏ nhạt
                          headerBgClass = 'bg-danger bg-opacity-10';
                        } else if (daysUntilDue <= 30) {
                          // Gần đến hạn (<= 30 ngày) - màu cam nhạt
                          headerBgClass = 'bg-warning bg-opacity-10';
                        } else {
                          // Còn xa (> 30 ngày) - màu xanh nhạt
                          headerBgClass = 'bg-success bg-opacity-10';
                        }
                      }

                      return (
                        <div key={group.batchId} className="accordion-item mb-3">
                          <h2 className="accordion-header" id={`heading-${group.batchId}`}>
                            <button
                              className={`accordion-button ${isExpanded ? '' : 'collapsed'} ${headerBgClass}`}
                              type="button"
                              onClick={toggleGroup}
                              aria-expanded={isExpanded}
                              aria-controls={collapseId}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="d-flex flex-wrap justify-content-between align-items-start w-100 me-3 gap-3">
                                {/* Bên trái: Tiêu đề, Batch ID, Lịch trình - chia 2 hàng */}
                                <div className="d-flex flex-column gap-2 flex-grow-1" style={{ minWidth: 'min(100%, 250px)' }}>
                                  {/* Hàng trên: Tiêu đề và Batch ID */}
                                  <div className="d-flex align-items-center gap-2">
                                    <i className="fas fa-layer-group text-primary"></i>
                                    <h6 className="mb-0 fw-bold">{getShortTitle(group.title)}</h6>
                                  </div>

                                  {/* Hàng dưới: Lịch trình */}
                                  {(group.lastMaintenanceDate || group.nextMaintenanceDate) && (
                                    <div className="d-flex flex-wrap align-items-center text-muted small" style={{ rowGap: '4px' }}>
                                      <div className="d-flex align-items-center me-3">
                                        <i className="fas fa-calendar-check text-success me-1"></i>
                                        <span>BT trước: <strong>{formatDateDisplay(group.lastMaintenanceDate) || '-'}</strong></span>
                                      </div>
                                      
                                      <div className="d-flex align-items-center flex-wrap">
                                        <i className="fas fa-clock text-primary me-1"></i>
                                        <span>BT sắp đến: <strong>{formatDateDisplay(group.nextMaintenanceDate) || '-'}</strong></span>
                                        {group.nextMaintenanceDate && (() => {
                                          const nextDate = group.nextMaintenanceDate instanceof Date
                                            ? group.nextMaintenanceDate
                                            : new Date(group.nextMaintenanceDate);
                                          const today = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          nextDate.setHours(0, 0, 0, 0);
                                          const daysUntilDue = Math.ceil((nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                                          
                                          if (daysUntilDue <= 0 && group.matchedReport) {
                                            return (
                                              <span className="ms-md-2 mt-1 mt-md-0 px-2 py-0 border border-info border-opacity-50 text-info rounded bg-info bg-opacity-10 d-inline-flex align-items-center" style={{ fontSize: '0.75rem' }}>
                                                <i className="fas fa-tools me-1"></i>đang thực hiện: {formatDateDisplay(group.matchedReport.reportDate)}
                                              </span>
                                            );
                                          }

                                          const statusText = daysUntilDue > 0 ? `còn lại ${daysUntilDue} ngày` : daysUntilDue === 0 ? 'hôm nay' : `quá ${Math.abs(daysUntilDue)} ngày`;
                                          return <span className="ms-1">({statusText})</span>;
                                        })()}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Bên phải: Thông tin thiết bị, badges và action buttons - chia 2 hàng, căn lề phải */}
                                <div className="d-flex flex-column align-items-start align-items-md-end gap-2 flex-grow-1 flex-md-shrink-0 w-100 w-md-auto mt-2 mt-md-0">
                                  {/* Hàng trên: Thông tin thiết bị và badges */}
                                  <div className="d-flex flex-wrap align-items-center gap-1 gap-md-2 justify-content-start justify-content-md-end w-100 w-md-auto">
                                    <span className="text-muted small me-2">
                                      <i className="fas fa-boxes me-1"></i>
                                      <span className="fw-bold">{group.totalDevices}</span> thiết bị
                                    </span>
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 fw-normal small">{group.activeCount} hoạt động</span>
                                    {activeTab === 'plans' ? null : group.inactiveCount > 0 && (
                                      <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 fw-normal small">{group.inactiveCount} đã hủy</span>
                                    )}
                                    {/* Batch Status Indicator based on current events */}
                                    {(() => {
                                      const inProgress = (group as any).inProgressCount || 0;
                                      const planned = (group as any).plannedCount || 0;
                                      if (inProgress > 0) {
                                        return <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 fw-normal small"><i className="fas fa-tools me-1"></i>{inProgress} đang bảo trì</span>;
                                      } else if (planned > 0) {
                                        return <span className="badge bg-warning bg-opacity-25 text-dark border border-warning border-opacity-50 fw-normal small"><i className="fas fa-hourglass-half me-1"></i>{planned} chờ xử lý</span>;
                                      }
                                      return null;
                                    })()}
                                    {group.maintenanceType === 'outsource' && group.maintenanceProvider && (
                                      <span className="badge bg-info bg-opacity-10 text-info border border-info border-opacity-25 fw-normal small text-truncate" style={{ maxWidth: '150px' }}>
                                        <i className="fas fa-building me-1"></i>
                                        {group.maintenanceProvider}
                                      </span>
                                    )}
                                    {group.maintenanceType === 'internal' && (
                                      <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary border-opacity-25 fw-normal small">Nội bộ</span>
                                    )}
                                  </div>

                                  {/* Hàng dưới: Action buttons */}
                                  <div className="d-flex flex-wrap gap-2 justify-content-start justify-content-md-end mt-1 w-100 w-md-auto" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      className="btn btn-sm btn-outline-info d-flex align-items-center justify-content-center"
                                      style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                                      onClick={() => {
                                        setSelectedGroup({
                                          batchId: group.batchId,
                                          title: group.title,
                                          plans: group.plans,
                                        });
                                        setShowViewPlanModal(true);
                                      }}
                                      title="Xem chi tiết kế hoạch"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                    {group.activeCount > 0 && (
                                      <>
                                        {(() => {
                                          // Kiểm tra xem có plan nào đã đến hạn không
                                          const today = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          const hasDuePlans = group.plans.some((plan) => {
                                            if (!plan.isActive || !plan.nextDueDate) return false;
                                            const dueDate = new Date(plan.nextDueDate);
                                            dueDate.setHours(0, 0, 0, 0);
                                            return dueDate <= today;
                                          });
 
                                          return hasDuePlans ? (
                                            <button
                                              className="btn btn-sm btn-outline-success d-flex align-items-center justify-content-center"
                                              style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                                              onClick={() => {
                                                setSelectedGroup(group);
                                                setBatchCompleteDate(formatDateInput(new Date()));
                                                setBatchCompleteNotes('');
                                                setBatchCompleteStaffId(null);
                                                loadStaffList();
                                                setShowBatchCompleteModal(true);
                                              }}
                                              title="Ghi nhận hoàn thành tất cả"
                                            >
                                              <i className="fas fa-check-double"></i>
                                            </button>
                                          ) : null;
                                        })()}
                                        <button
                                          className="btn btn-sm btn-outline-info d-flex align-items-center justify-content-center"
                                          style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                                          onClick={() => handleOpenEditBatch(group.batchId, group.title)}
                                          title="Sửa thông tin kế hoạch"
                                        >
                                          <i className="fas fa-edit"></i>
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-warning d-flex align-items-center justify-content-center"
                                          style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                                          onClick={() => {
                                            setSelectedGroup(group);
                                            // Set default date to earliest nextDueDate or today
                                            const earliestDate = group.plans
                                              .filter(p => p.isActive && p.nextDueDate)
                                              .map(p => p.nextDueDate ? new Date(p.nextDueDate) : null)
                                              .filter(d => d !== null)
                                              .sort((a, b) => (a?.getTime() || 0) - (b?.getTime() || 0))[0];
                                            setBatchRescheduleDate(earliestDate ? formatDateInput(earliestDate) : formatDateInput(new Date()));
                                            setShowBatchRescheduleModal(true);
                                          }}
                                          title="Dời lịch bảo trì tất cả"
                                        >
                                          <i className="fas fa-calendar-alt"></i>
                                        </button>
                                        <button
                                          className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                                          style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                                          onClick={() => {
                                            setSelectedGroup(group);
                                            setShowBatchCancelModal(true);
                                          }}
                                          title="Hủy kế hoạch tất cả"
                                        >
                                          <i className="fas fa-times"></i>
                                        </button>
                                      </>
                                    )}
                                    <button
                                      className="btn btn-sm btn-outline-danger d-flex align-items-center justify-content-center"
                                      style={{ width: '32px', height: '32px', borderRadius: '6px' }}
                                      onClick={() => handleBatchDelete(group)}
                                      title="Xóa kế hoạch tất cả"
                                    >
                                      <i className="fas fa-trash"></i>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </button>
                          </h2>
                          <div
                            id={collapseId}
                            className={`accordion-collapse collapse ${isExpanded ? 'show' : ''}`}
                            aria-labelledby={`heading-${group.batchId}`}
                          >
                            <div className="accordion-body p-0">
                              <div className="table-responsive">
                                <table className="table table-hover mb-0">
                                  <thead className="table-light">
                                    <tr>
                                      <th style={{ width: '50px' }} className="align-middle text-center">#</th>
                                      <th className="align-middle">
                                        <div className="d-flex align-items-center gap-2">
                                          <span>Thiết Bị ({group.totalDevices})</span>
                                          {group.canModifyDevices && (
                                            <div className="d-flex gap-1 ms-2">
                                              <button
                                                className="btn btn-outline-success p-0 d-flex align-items-center justify-content-center"
                                                style={{ width: '20px', height: '20px', fontSize: '0.7rem', borderRadius: '4px' }}
                                                onClick={() => {
                                                  setSelectedGroupForDevices({
                                                    batchId: group.batchId,
                                                    title: group.title,
                                                    plans: group.plans,
                                                    metadata: group.metadata,
                                                  });
                                                  setDevicesToAdd([]);
                                                  loadAllDevicesForModal();
                                                  setShowAddDevicesModal(true);
                                                }}
                                                title="Thêm thiết bị"
                                              >
                                                <i className="fas fa-plus"></i>
                                              </button>
                                              <button
                                                className="btn btn-outline-secondary p-0 d-flex align-items-center justify-content-center"
                                                style={{ width: '20px', height: '20px', fontSize: '0.7rem', borderRadius: '4px' }}
                                                onClick={async () => {
                                                  setSelectedGroupForDevices({
                                                    batchId: group.batchId,
                                                    title: group.title,
                                                    plans: group.plans,
                                                    metadata: group.metadata,
                                                  });
                                                  setDevicesToRemove([]);
                                                  await loadAllDevicesForModal();
                                                  setShowRemoveDevicesModal(true);
                                                }}
                                                title="Bớt thiết bị"
                                              >
                                                <i className="fas fa-minus"></i>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </th>
                                      <th className="text-end align-middle px-3" style={{ width: '150px' }}>Thao Tác</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.plans.map((plan, index) => {
                                      const event = planEvents[plan.id];
                                      const hasEvent = !!event;
                                      const eventStatus = event?.status;

                                      return (
                                        <tr key={plan.id}>
                                          <td className="align-middle text-muted small">{index + 1}</td>
                                          <td className="align-middle">
                                            <strong>{plan.deviceName || `Thiết bị #${plan.deviceId}`}</strong>
                                          </td>
                                          <td className="text-end">
                                            {plan.isActive ? (
                                              <div className="btn-group btn-group-sm d-inline-flex">
                                                {/* Event actions */}
                                                {hasEvent && eventStatus === 'planned' && (
                                                  <button
                                                    className="btn btn-primary"
                                                    onClick={() => {
                                                      setSelectedEvent(event);
                                                      setStartStaffId(event.staffId || null);
                                                      setStartNotes('');
                                                      loadStaffList();
                                                      setShowStartModal(true);
                                                    }}
                                                    title="Bắt đầu bảo trì"
                                                  >
                                                    <i className="fas fa-play"></i>
                                                  </button>
                                                )}
                                                {hasEvent && eventStatus === 'in_progress' && (
                                                  <button
                                                    className="btn btn-success"
                                                    onClick={() => {
                                                      setSelectedEvent(event);
                                                      setCompleteDate(formatDateInput(new Date()));
                                                      setCompleteNotes('');
                                                      setCompleteStaffId(event.staffId || null);
                                                      loadStaffList();
                                                      setShowCompleteModal(true);
                                                    }}
                                                    title="Ghi nhận hoàn thành"
                                                  >
                                                    <i className="fas fa-check"></i>
                                                  </button>
                                                )}

                                                {/* Plan actions */}
                                                <button
                                                  className="btn btn-outline-warning"
                                                  onClick={() => {
                                                    setSelectedPlan(plan);
                                                    setRescheduleDate(plan.nextDueDate ? formatDateInput(plan.nextDueDate) : formatDateInput(new Date()));
                                                    setShowRescheduleModal(true);
                                                  }}
                                                  title="Dời lịch"
                                                >
                                                  <i className="fas fa-calendar-alt"></i>
                                                </button>
                                                <button
                                                  className="btn btn-outline-danger"
                                                  onClick={() => {
                                                    setSelectedPlan(plan);
                                                    setShowCancelModal(true);
                                                  }}
                                                  title="Hủy"
                                                >
                                                  <i className="fas fa-times"></i>
                                                </button>
                                                <button
                                                  className="btn btn-outline-danger"
                                                  onClick={() => handleDeletePlan(plan.id)}
                                                  title="Xóa"
                                                >
                                                  <i className="fas fa-trash"></i>
                                                </button>
                                              </div>
                                            ) : (
                                              <span className="text-muted small">
                                                <i className="fas fa-lock me-1" title="Chỉ xem"></i>
                                              </span>
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {activeTab === 'plans' && groupedPlans.length > 0 && (
                  <div className="card mt-4 border-0 shadow-sm bg-light">
                    <div className="card-header bg-white border-0 py-2">
                      <h6 className="mb-0 text-muted small"><i className="fas fa-info-circle me-2"></i>Chú thích thao tác (Dành cho đợt bảo trì)</h6>
                    </div>
                    <div className="card-body py-2">
                      <div className="row g-2">
                        <div className="col-md-auto col-6 d-flex align-items-center me-3">
                          <span className="badge bg-outline-info text-info border border-info me-2"><i className="fas fa-eye"></i></span>
                          <small className="text-secondary" style={{ fontSize: '0.75rem' }}>Xem chi tiết</small>
                        </div>
                        <div className="col-md-auto col-6 d-flex align-items-center me-3">
                          <span className="badge bg-outline-success text-success border border-success me-2"><i className="fas fa-check-double"></i></span>
                          <small className="text-secondary" style={{ fontSize: '0.75rem' }}>Hoàn thành tất cả</small>
                        </div>
                        <div className="col-md-auto col-6 d-flex align-items-center me-3">
                          <span className="badge bg-outline-primary text-primary border border-primary me-2"><i className="fas fa-edit"></i></span>
                          <small className="text-secondary" style={{ fontSize: '0.75rem' }}>Sửa kế hoạch</small>
                        </div>
                        <div className="col-md-auto col-6 d-flex align-items-center me-3">
                          <span className="badge bg-outline-warning text-warning border border-warning me-2"><i className="fas fa-calendar-alt"></i></span>
                          <small className="text-secondary" style={{ fontSize: '0.75rem' }}>Dời lịch bảo trì</small>
                        </div>
                        <div className="col-md-auto col-6 d-flex align-items-center">
                          <span className="badge bg-outline-danger text-danger border border-danger me-2"><i className="fas fa-times"></i></span>
                          <small className="text-secondary" style={{ fontSize: '0.75rem' }}>Hủy/Xóa kế hoạch</small>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Batch Details Modal */}
        {showBatchModal && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-layer-group me-2"></i>
                    Chi Tiết Batch: {getShortTitle(selectedBatchTitle || selectedBatchId || '')}
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-outline-success btn-sm d-flex align-items-center gap-2"
                      onClick={() => {
                        setExportTitle(`Xuất lịch sử bảo trì: ${getShortTitle(selectedBatchTitle || selectedBatchId || '')}`);
                        setExportParams({ batchId: selectedBatchId });
                        setShowExportModal(true);
                      }}
                      title="Xuất lịch sử bảo trì của kế hoạch này"
                    >
                      <i className="fas fa-file-excel"></i>
                      <span className="d-none d-sm-inline">Xuất lịch sử</span>
                    </button>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowBatchModal(false);
                        setSelectedBatchId(null);
                        setBatchEvents([]);
                      }}
                    ></button>
                  </div>
                </div>
                <div className="modal-body">
                  {/* Tabs */}
                  <ul className="nav nav-tabs mb-3">
                    <li className="nav-item">
                      <button
                        className={`nav-link ${batchModalTab === 'events' ? 'active' : ''}`}
                        onClick={() => setBatchModalTab('events')}
                      >
                        <i className="fas fa-list me-1"></i>
                        Sự Kiện
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        className={`nav-link ${batchModalTab === 'rounds' ? 'active' : ''}`}
                        onClick={() => setBatchModalTab('rounds')}
                      >
                        <i className="fas fa-history me-1"></i>
                        Lịch Sử Đợt Bảo Trì
                      </button>
                    </li>
                  </ul>

                  {/* Tab Content: Events */}
                  {batchModalTab === 'events' && (
                    <>
                      {loadingBatchDetails ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                          </div>
                        </div>
                      ) : batchEvents.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <p>Không có event nào trong batch này</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Thiết Bị</th>
                                <th>Trạng Thái</th>
                                <th>Ngày Sự Kiện</th>
                                <th>Ngày Hoàn Thành</th>
                                <th>Nhân Viên</th>
                                <th>Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {batchEvents.map((event) => (
                                <tr key={event.id}>
                                  <td>{event.deviceName}</td>
                                  <td>
                                    {(() => {
                                      // Tìm plan tương ứng với event để check isActive
                                      const relatedPlan = allPlans.find(p =>
                                        p.deviceId === event.deviceId &&
                                        p.eventTypeId === event.eventTypeId &&
                                        p.metadata?.maintenanceBatchId === event.maintenanceBatchId
                                      );
                                      const isPlanActive = relatedPlan?.isActive ?? true; // Default true nếu không tìm thấy

                                      let displayText = '';
                                      let badgeClass = '';

                                      if (event.status === 'completed') {
                                        // Chỉ áp dụng logic "Chờ đợt tiếp theo" cho lịch đang hoạt động
                                        if (isPlanActive) {
                                          const today = new Date();
                                          today.setHours(0, 0, 0, 0);
                                          const endDate = event.endDate ? new Date(event.endDate) : null;
                                          const eventDate = event.eventDate ? new Date(event.eventDate) : null;
                                          const completedDate = endDate || eventDate;

                                          if (completedDate) {
                                            completedDate.setHours(0, 0, 0, 0);
                                            if (completedDate < today) {
                                              displayText = 'Chờ đợt tiếp theo';
                                              badgeClass = 'bg-secondary';
                                            } else {
                                              displayText = 'Hoàn thành';
                                              badgeClass = 'bg-success';
                                            }
                                          } else {
                                            displayText = 'Hoàn thành';
                                            badgeClass = 'bg-success';
                                          }
                                        } else {
                                          // Lịch đã hủy, luôn hiển thị "Hoàn thành"
                                          displayText = 'Hoàn thành';
                                          badgeClass = 'bg-success';
                                        }
                                      } else if (event.status === 'in_progress') {
                                        displayText = 'Đang tiến hành';
                                        badgeClass = 'bg-info';
                                      } else if (event.status === 'planned') {
                                        displayText = 'Đã lên kế hoạch';
                                        badgeClass = 'bg-secondary';
                                      } else {
                                        displayText = 'Đã hủy';
                                        badgeClass = 'bg-danger';
                                      }

                                      return (
                                        <span className={`badge ${badgeClass}`}>
                                          {displayText}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td>{formatDateDisplay(event.eventDate)}</td>
                                  <td>{event.endDate ? formatDateDisplay(event.endDate) : '-'}</td>
                                  <td>{event.staffName || '-'}</td>
                                  <td className="text-end">
                                    {(() => {
                                      // Tìm plan tương ứng với event để check isActive
                                      const relatedPlan = allPlans.find(p =>
                                        p.deviceId === event.deviceId &&
                                        p.metadata?.maintenanceBatchId === event.maintenanceBatchId
                                      );
                                      const isPlanActive = relatedPlan ? relatedPlan.isActive : true; // Default true nếu không tìm thấy

                                      if (!isPlanActive) {
                                        return (
                                          <span className="text-muted small">
                                            <i className="fas fa-lock me-1"></i>
                                            Chỉ xem
                                          </span>
                                        );
                                      }

                                      return (
                                        <div className="d-flex align-items-center justify-content-end gap-2">
                                          {event.relatedReportId && (
                                            <button
                                              className="btn btn-sm btn-outline-info"
                                              onClick={() => handleQuickViewReport(event.relatedReportId!)}
                                              title="Xem báo cáo liên quan"
                                            >
                                              <i className="fas fa-file-alt"></i>
                                            </button>
                                          )}
                                          
                                          {event.status === 'planned' && (
                                            <button
                                              className="btn btn-sm btn-primary"
                                              onClick={() => {
                                                setSelectedEvent(event);
                                                setStartStaffId(event.staffId || null);
                                                setStartNotes('');
                                                loadStaffList();
                                                setShowStartModal(true);
                                              }}
                                              title="Bắt đầu bảo trì"
                                            >
                                              <i className="fas fa-play me-1"></i>
                                              Bắt đầu
                                            </button>
                                          )}
                                          {event.status === 'in_progress' && (
                                            <button
                                              className="btn btn-sm btn-success"
                                              onClick={() => {
                                                setSelectedEvent(event);
                                                setCompleteDate(formatDateInput(new Date()));
                                                setCompleteNotes('');
                                                setCompleteStaffId(event.staffId || null);
                                                loadStaffList();
                                                setShowCompleteModal(true);
                                              }}
                                              title="Ghi nhận hoàn thành"
                                            >
                                              <i className="fas fa-check me-1"></i>
                                              Hoàn thành
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}

                  {/* Tab Content: Maintenance Rounds */}
                  {batchModalTab === 'rounds' && (
                    <>
                      {loadingRounds ? (
                        <div className="text-center py-5">
                          <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                          </div>
                        </div>
                      ) : maintenanceRounds.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          <p>Chưa có đợt bảo trì nào đã hoàn thành</p>
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-sm">
                            <thead>
                              <tr>
                                <th>Ngày Bảo Trì</th>
                                <th>Số Thiết Bị</th>
                                <th>Hoàn Thành</th>
                                <th>Loại Bảo Trì</th>
                                <th>Nhà Cung Cấp</th>
                                <th>Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody>
                              {maintenanceRounds.map((round, index) => (
                                <tr key={index}>
                                  <td>
                                    <strong>{formatDateDisplay(round.roundDate)}</strong>
                                  </td>
                                  <td>
                                    <span className="badge bg-info">{round.totalDevices}</span>
                                  </td>
                                  <td>
                                    <span className="badge bg-success">{round.completedDevices}/{round.totalDevices}</span>
                                  </td>
                                  <td>
                                    {round.maintenanceType === 'outsource' ? (
                                      <span className="badge bg-primary">Thuê ngoài</span>
                                    ) : (
                                      <span className="badge bg-secondary">Nội bộ</span>
                                    )}
                                  </td>
                                  <td>
                                    {round.maintenanceProvider || '-'}
                                  </td>
                                  <td>
                                    <div className="btn-group btn-group-sm">
                                      <button
                                        className="btn btn-outline-info"
                                        onClick={() => handleViewRound(round.batchId, round.roundDate)}
                                        title="Xem chi tiết"
                                      >
                                        <i className="fas fa-eye me-1"></i>
                                        Xem
                                      </button>
                                      <button
                                        className="btn btn-outline-success"
                                        onClick={() => handleExportRound(round.batchId, round.roundDate)}
                                        title="Xuất Excel"
                                      >
                                        <i className="fas fa-file-excel me-1"></i>
                                        Excel
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBatchModal(false);
                      setSelectedBatchId(null);
                      setBatchEvents([]);
                      setMaintenanceRounds([]);
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Round Detail Modal */}
        {showRoundDetailModal && selectedRound && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-clipboard-list me-2"></i>
                    Báo Cáo Đợt Bảo Trì - {selectedRound.roundDate ? formatDateDisplay(selectedRound.roundDate) : ''}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowRoundDetailModal(false);
                      setSelectedRound(null);
                      setRoundDetail(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {loadingRoundDetail ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                    </div>
                  ) : !roundDetail ? (
                    <div className="text-center py-5 text-muted">
                      <p>Không tìm thấy dữ liệu đợt bảo trì</p>
                    </div>
                  ) : (
                    <>
                      {/* Batch Info */}
                      <div className="card mb-3">
                        <div className="card-body">
                          <h6 className="card-title mb-3">
                            <i className="fas fa-info-circle me-2"></i>
                            Thông Tin Đợt Bảo Trì
                          </h6>
                          <div className="row">
                            <div className="col-md-6">
                              <div className="mb-2">
                                <small className="text-muted">Kế hoạch:</small>
                                <div><strong>{roundDetail.batchInfo?.title || '-'}</strong></div>
                              </div>
                              <div className="mb-2">
                                <small className="text-muted">Batch ID:</small>
                                <div><code>{roundDetail.batchInfo?.batchId || '-'}</code></div>
                              </div>
                              <div className="mb-2">
                                <small className="text-muted">Ngày bảo trì:</small>
                                <div><strong>{formatDateDisplay(roundDetail.roundDate)}</strong></div>
                              </div>
                            </div>
                            <div className="col-md-6">
                              <div className="mb-2">
                                <small className="text-muted">Tổng số thiết bị:</small>
                                <div><span className="badge bg-info">{roundDetail.totalDevices}</span></div>
                              </div>
                              <div className="mb-2">
                                <small className="text-muted">Đã hoàn thành:</small>
                                <div><span className="badge bg-success">{roundDetail.completedDevices}/{roundDetail.totalDevices}</span></div>
                              </div>
                              {roundDetail.batchInfo?.maintenanceType && (
                                <div className="mb-2">
                                  <small className="text-muted">Loại bảo trì:</small>
                                  <div>
                                    {roundDetail.batchInfo.maintenanceType === 'outsource' ? (
                                      <span className="badge bg-primary">Thuê ngoài</span>
                                    ) : (
                                      <span className="badge bg-secondary">Nội bộ</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {roundDetail.batchInfo?.maintenanceProvider && (
                                <div className="mb-2">
                                  <small className="text-muted">Nhà cung cấp:</small>
                                  <div><strong>{roundDetail.batchInfo.maintenanceProvider}</strong></div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Devices Table */}
                      <div className="card mb-3">
                        <div className="card-header">
                          <h6 className="mb-0">
                            <i className="fas fa-list me-2"></i>
                            Chi Tiết Thiết Bị
                          </h6>
                        </div>
                        <div className="card-body p-0">
                          <div className="table-responsive">
                            <table className="table table-sm table-hover mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th className="col-stt">STT</th>
                                  <th>Tên Thiết Bị</th>
                                  <th>Serial</th>
                                  <th>Loại Sự Kiện</th>
                                  <th>Ngày Bảo Trì</th>
                                  <th>Nhân Viên</th>
                                  <th>Kết Quả</th>
                                  <th>Ghi Chú</th>
                                  <th>Báo Cáo CV</th>
                                </tr>
                              </thead>
                              <tbody>
                                {roundDetail.events && roundDetail.events.length > 0 ? (
                                  roundDetail.events.map((event: any, index: number) => {
                                    const statusText = event.status === 'completed' ? 'Hoàn thành' :
                                      event.status === 'in_progress' ? 'Đang thực hiện' :
                                        event.status === 'planned' ? 'Kế hoạch' : 'Khác';
                                    const statusBadge = event.status === 'completed' ? 'bg-success' :
                                      event.status === 'in_progress' ? 'bg-info' :
                                        event.status === 'planned' ? 'bg-secondary' : 'bg-warning';
                                    const maintenanceDate = event.endDate || event.eventDate || event.startDate;

                                    return (
                                      <tr key={event.id}>
                                        <td className="col-stt">{index + 1}</td>
                                        <td><strong>{event.deviceName || '-'}</strong></td>
                                        <td>{event.deviceSerial || '-'}</td>
                                        <td>{event.eventTypeName || '-'}</td>
                                        <td>{maintenanceDate ? formatDateDisplay(maintenanceDate) : '-'}</td>
                                        <td>{event.staffName || '-'}</td>
                                        <td>
                                          <span className={`badge ${statusBadge}`}>{statusText}</span>
                                        </td>
                                        <td>
                                          <small className="text-muted">{event.notes || '-'}</small>
                                        </td>
                                        <td>
                                          {event.relatedReportId ? (
                                            <div className="d-flex flex-column gap-1">
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => handleQuickViewReport(event.relatedReportId!)}
                                                title="Xem nhanh báo cáo"
                                              >
                                                <i className="fas fa-eye me-1"></i>
                                                Xem nhanh
                                              </button>
                                              <a
                                                href={`/dashboard/damage-reports?search=${event.relatedReportId}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm btn-link p-0 text-decoration-none"
                                                style={{ fontSize: '0.75rem' }}
                                              >
                                                Mở chi tiết
                                              </a>
                                            </div>
                                          ) : (
                                            <span className="text-muted">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={9} className="text-center text-muted py-3">
                                      Không có dữ liệu
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Related Damage Reports */}
                      {roundDetail.damageReports && roundDetail.damageReports.length > 0 && (
                        <div className="card">
                          <div className="card-header">
                            <h6 className="mb-0">
                              <i className="fas fa-file-alt me-2"></i>
                              Báo Cáo Công Việc Liên Quan
                            </h6>
                          </div>
                          <div className="card-body p-0">
                            <div className="table-responsive">
                              <table className="table table-sm table-hover mb-0">
                                <thead className="table-light">
                                  <tr>
                                    <th>ID</th>
                                    <th>Nội Dung</th>
                                    <th>Người Báo</th>
                                    <th>Người Xử Lý</th>
                                    <th>Ngày Báo</th>
                                    <th>Trạng Thái</th>
                                    <th>Thao Tác</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {roundDetail.damageReports.map((report: any) => {
                                    const statusLabels: Record<number, string> = {
                                      1: 'Chờ xử lý',
                                      2: 'Đã phân công',
                                      3: 'Đang xử lý',
                                      4: 'Hoàn thành',
                                      5: 'Đã hủy',
                                      6: 'Từ chối',
                                    };
                                    const statusBadges: Record<number, string> = {
                                      1: 'bg-secondary',
                                      2: 'bg-info',
                                      3: 'bg-warning',
                                      4: 'bg-success',
                                      5: 'bg-danger',
                                      6: 'bg-danger',
                                    };

                                    return (
                                      <tr key={report.id}>
                                        <td><strong>#{report.id}</strong></td>
                                        <td>
                                          <small>{report.damageContent || '-'}</small>
                                        </td>
                                        <td>{report.reporterName || '-'}</td>
                                        <td>{report.handlerName || '-'}</td>
                                        <td>{report.reportDate ? formatDateDisplay(report.reportDate) : '-'}</td>
                                        <td>
                                          <span className={`badge ${statusBadges[report.status] || 'bg-secondary'}`}>
                                            {statusLabels[report.status] || 'N/A'}
                                          </span>
                                        </td>
                                        <td>
                                            <div className="d-flex flex-column gap-1">
                                              <button
                                                type="button"
                                                className="btn btn-sm btn-outline-primary"
                                                onClick={() => handleQuickViewReport(report.id)}
                                                title="Xem nhanh"
                                              >
                                                <i className="fas fa-eye me-1"></i>
                                                Xem
                                              </button>
                                              <a
                                                href={`/dashboard/damage-reports?search=${report.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="btn btn-sm btn-link p-0 text-decoration-none"
                                                style={{ fontSize: '0.75rem' }}
                                              >
                                                Mở mới
                                              </a>
                                            </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => {
                      if (selectedRound) {
                        handleExportRound(selectedRound.batchId, selectedRound.roundDate);
                      }
                    }}
                  >
                    <i className="fas fa-file-excel me-2"></i>
                    Xuất Excel
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowRoundDetailModal(false);
                      setSelectedRound(null);
                      setRoundDetail(null);
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && selectedPlan && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Dời Lịch Bảo Trì</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowRescheduleModal(false);
                      setSelectedPlan(null);
                      setRescheduleDate('');
                      setRescheduleReason('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Thiết Bị</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedPlan.deviceName || `Thiết bị #${selectedPlan.deviceId}`}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ngày Đến Hạn Hiện Tại</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedPlan.nextDueDate ? formatDateDisplay(selectedPlan.nextDueDate) : '-'}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ngày Đến Hạn Mới <span className="text-danger">*</span></label>
                    <DateInput
                      value={rescheduleDate}
                      onChange={(value) => setRescheduleDate(value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Lý Do Dời Lịch <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Nhập lý do dời lịch..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowRescheduleModal(false);
                      setSelectedPlan(null);
                      setRescheduleDate('');
                      setRescheduleReason('');
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleReschedule}
                  >
                    <i className="fas fa-save me-2"></i>
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && selectedPlan && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Hủy Kế Hoạch Bảo Trì</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowCancelModal(false);
                      setSelectedPlan(null);
                      setCancelReason('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Thiết Bị</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedPlan.deviceName || `Thiết bị #${selectedPlan.deviceId}`}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tiêu Đề</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedPlan.title || '-'}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Lý Do Hủy <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Nhập lý do hủy kế hoạch..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCancelModal(false);
                      setSelectedPlan(null);
                      setCancelReason('');
                    }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleCancel}
                  >
                    <i className="fas fa-times me-2"></i>
                    Xác Nhận Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Batch Details Modal */}
        {showViewPlanModal && selectedGroup && (() => {
          // Calculate values from plans
          const totalDevices = selectedGroup.plans.length;
          const activeCount = selectedGroup.plans.filter(p => p.isActive).length;
          const inactiveCount = selectedGroup.plans.filter(p => !p.isActive).length;

          // Calculate lastMaintenanceDate and nextMaintenanceDate
          const completedDates = selectedGroup.plans
            .map(plan => {
              if (plan.lastCompletedEvent?.endDate) {
                return new Date(plan.lastCompletedEvent.endDate);
              }
              const event = planEvents[plan.id];
              if (event?.status === 'completed' && event?.endDate) {
                return new Date(event.endDate);
              }
              return null;
            })
            .filter((d): d is Date => d !== null);

          const nextDates = selectedGroup.plans
            .filter(p => p.isActive && p.nextDueDate)
            .map(p => new Date(p.nextDueDate!))
            .filter(d => !isNaN(d.getTime()));

          const lastMaintenanceDate = completedDates.length > 0
            ? completedDates.sort((a, b) => b.getTime() - a.getTime())[0]
            : null;

          const nextMaintenanceDate = nextDates.length > 0
            ? nextDates.sort((a, b) => a.getTime() - b.getTime())[0]
            : null;

          const firstPlan = selectedGroup.plans[0];

          return (
            <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header py-2">
                    <h6 className="modal-title mb-0">Chi tiết kế hoạch</h6>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => {
                        setShowViewPlanModal(false);
                        setSelectedGroup(null);
                      }}
                    ></button>
                  </div>
                  <div className="modal-body py-3">
                    {/* Tiêu đề */}
                    <div className="mb-3">
                      <div className="text-muted small mb-1">Tên kế hoạch bảo trì</div>
                      <div className="h5 fw-bold text-primary mb-0">{getShortTitle(selectedGroup.title)}</div>
                    </div>

                    {/* Mô tả */}
                    {firstPlan?.description && (
                      <div className="mb-3">
                        <div className="text-muted small mb-1">Mô tả</div>
                        <div>{firstPlan.description}</div>
                      </div>
                    )}

                    {/* Thông tin chính */}
                    <div className="row g-2 mb-3">
                      <div className="col-4">
                        <div className="text-muted small mb-1">Thiết bị</div>
                        <div className="fw-bold">{totalDevices}</div>
                      </div>
                      <div className="col-4">
                        <div className="text-muted small mb-1">Hoạt động</div>
                        <span className="badge bg-success">{activeCount}</span>
                      </div>
                      {inactiveCount > 0 && (
                        <div className="col-4">
                          <div className="text-muted small mb-1">Đã hủy</div>
                          <span className="badge bg-secondary">{inactiveCount}</span>
                        </div>
                      )}
                    </div>

                    {/* Thông tin bảo trì */}
                    <div className="row g-2 mb-3">
                      {firstPlan?.metadata?.maintenanceType && (
                        <div className="col-6">
                          <div className="text-muted small mb-1">Loại bảo trì</div>
                          {firstPlan.metadata.maintenanceType === 'internal' ? (
                            <span className="badge bg-primary">Nội Bộ</span>
                          ) : (
                            <span className="badge bg-info">Thuê Ngoài</span>
                          )}
                        </div>
                      )}

                      {firstPlan?.intervalValue && (
                        <div className="col-6">
                          <div className="text-muted small mb-1">Chu kỳ</div>
                          <div>
                            {firstPlan.intervalValue} {firstPlan.intervalUnit === 'day' ? 'ngày' : firstPlan.intervalUnit === 'week' ? 'tuần' : firstPlan.intervalUnit === 'month' ? 'tháng' : 'năm'}
                          </div>
                        </div>
                      )}

                      {firstPlan?.metadata?.maintenanceProvider && (
                        <div className="col-12">
                          <div className="text-muted small mb-1">Nhà cung cấp</div>
                          <div>{firstPlan.metadata.maintenanceProvider}</div>
                        </div>
                      )}
                    </div>

                    {/* Lịch trình */}
                    {(lastMaintenanceDate || nextMaintenanceDate) && (
                      <div className="row g-2">
                        {lastMaintenanceDate && (
                          <div className="col-6">
                            <div className="text-muted small mb-1">BT trước</div>
                            <div className="text-success small">
                              {formatDateDisplay(lastMaintenanceDate)}
                            </div>
                          </div>
                        )}

                        {nextMaintenanceDate && (() => {
                          const daysUntilDue = Math.ceil(
                            (new Date(nextMaintenanceDate).getTime() - new Date().getTime()) /
                            (1000 * 60 * 60 * 24)
                          );
                          return (
                            <div className="col-6">
                              <div className="text-muted small mb-1">BT sắp đến</div>
                              <div className="small">
                                <span className={getDaysUntilDueColor(daysUntilDue)}>
                                  {formatDateDisplay(nextMaintenanceDate)}
                                </span>
                                <span className={`ms-2 small ${getDaysUntilDueColor(daysUntilDue)}`}>
                                  ({daysUntilDue > 0 ? `Còn ${daysUntilDue} ngày` : daysUntilDue === 0 ? 'Hôm nay' : `Quá ${Math.abs(daysUntilDue)} ngày`})
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* Batch ID */}
                    {selectedGroup.batchId !== 'no-batch' && (
                      <div className="mt-3 pt-3 border-top">
                        <div className="text-muted small mb-1">Batch ID</div>
                        <span className="badge bg-secondary small">{selectedGroup.batchId}</span>
                      </div>
                    )}
                  </div>
                  <div className="modal-footer py-2">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => {
                        setShowViewPlanModal(false);
                        handleOpenEditBatch(selectedGroup.batchId, selectedGroup.title);
                      }}
                    >
                      <i className="fas fa-edit me-1"></i>
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => {
                        setShowViewPlanModal(false);
                        setSelectedGroup(null);
                      }}
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Edit Batch Modal */}
        {showEditIntervalModal && selectedGroupForInterval && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-edit me-2"></i>
                    Chỉnh Sửa Kế Hoạch Bảo Trì
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowEditIntervalModal(false);
                      setSelectedGroupForInterval(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {/* Tiêu đề */}
                  <div className="mb-3">
                    <label className="form-label fw-bold">Tiêu Đề <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={editBatchTitle}
                      onChange={(e) => setEditBatchTitle(e.target.value)}
                      placeholder="Nhập tiêu đề bảo trì..."
                    />
                  </div>

                  {/* Mô tả */}
                  <div className="mb-3">
                    <label className="form-label fw-bold">Mô Tả</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={editBatchDescription}
                      onChange={(e) => setEditBatchDescription(e.target.value)}
                      placeholder="Mô tả chi tiết kế hoạch..."
                    />
                  </div>

                  <div className="row">
                    {/* Chu kỳ */}
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-bold">Chu Kỳ Bảo Trì <span className="text-danger">*</span></label>
                        <div className="input-group">
                          <input
                            type="number"
                            className="form-control"
                            min="1"
                            value={editIntervalValue}
                            onChange={(e) => setEditIntervalValue(Number(e.target.value))}
                          />
                          <select
                            className="form-select"
                            value={editIntervalUnit}
                            onChange={(e) => setEditIntervalUnit(e.target.value as any)}
                            style={{ flex: '0 0 100px' }}
                          >
                            <option value="day">Ngày</option>
                            <option value="week">Tuần</option>
                            <option value="month">Tháng</option>
                            <option value="year">Năm</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ngày tính toán */}
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-bold">Ngày Bắt Đầu <span className="text-danger">*</span></label>
                        <DateInput
                          value={editBatchStartFrom}
                          onChange={(value) => setEditBatchStartFrom(value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label fw-bold">Ngày Kết Thúc</label>
                        <DateInput
                          value={editBatchEndAt}
                          onChange={(value) => setEditBatchEndAt(value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hình thức bảo trì */}
                  <div className="mb-3">
                    <label className="form-label fw-bold">Hình Thức Bảo Trì</label>
                    <div className="d-flex gap-4">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          id="editInternal"
                          checked={editBatchMaintenanceType === 'internal'}
                          onChange={() => setEditBatchMaintenanceType('internal')}
                        />
                        <label className="form-check-label" htmlFor="editInternal">Nội bộ</label>
                      </div>
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="radio"
                          id="editOutsource"
                          checked={editBatchMaintenanceType === 'outsource'}
                          onChange={() => setEditBatchMaintenanceType('outsource')}
                        />
                        <label className="form-check-label" htmlFor="editOutsource">Thuê ngoài</label>
                      </div>
                    </div>
                  </div>

                  {editBatchMaintenanceType === 'outsource' && (
                    <div className="row">
                      <div className="col-md-8">
                        <div className="mb-3">
                          <label className="form-label fw-bold">Nhà Cung Cấp <span className="text-danger">*</span></label>
                          <input
                            type="text"
                            className="form-control"
                            value={editBatchProvider}
                            onChange={(e) => setEditBatchProvider(e.target.value)}
                            placeholder="Tên công ty/nhà cung cấp..."
                          />
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <label className="form-label fw-bold">Dự Kiến Chi Phí</label>
                          <input
                            type="number"
                            className="form-control"
                            value={editBatchCost}
                            onChange={(e) => setEditBatchCost(Number(e.target.value))}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="alert alert-info py-2 small mb-0 mt-2">
                    <i className="fas fa-info-circle me-2"></i>
                    Thay đổi sẽ được áp dụng cho tất cả <strong>{selectedGroupForInterval.plans.filter(p => p.isActive).length}</strong> kế hoạch đang hoạt động trong batch này.
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEditIntervalModal(false);
                      setSelectedGroupForInterval(null);
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBatchUpdate}
                    disabled={savingBatchEdit}
                  >
                    {savingBatchEdit ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save me-2"></i>
                        Lưu Thay Đổi
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batch Reschedule Modal */}
        {showBatchRescheduleModal && selectedGroup && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Dời Lịch Bảo Trì Hàng Loạt</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowBatchRescheduleModal(false);
                      setSelectedGroup(null);
                      setBatchRescheduleDate('');
                      setBatchRescheduleReason('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <i className="fas fa-info-circle me-2"></i>
                    Bạn đang dời lịch cho <strong>{selectedGroup.plans.filter(p => p.isActive).length}</strong> kế hoạch đang hoạt động trong nhóm: <strong>{selectedGroup.title}</strong>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ngày Đến Hạn Mới <span className="text-danger">*</span></label>
                    <DateInput
                      value={batchRescheduleDate}
                      onChange={(value) => setBatchRescheduleDate(value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Lý Do Dời Lịch <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={batchRescheduleReason}
                      onChange={(e) => setBatchRescheduleReason(e.target.value)}
                      placeholder="Nhập lý do dời lịch cho tất cả kế hoạch..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBatchRescheduleModal(false);
                      setSelectedGroup(null);
                      setBatchRescheduleDate('');
                      setBatchRescheduleReason('');
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleBatchReschedule}
                  >
                    <i className="fas fa-save me-2"></i>
                    Xác Nhận Dời Lịch
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batch Complete Modal */}
        {showBatchCompleteModal && selectedGroup && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-check-double me-2"></i>
                    Ghi Nhận Hoàn Thành Bảo Trì Hàng Loạt
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowBatchCompleteModal(false);
                      setSelectedGroup(null);
                      setBatchCompleteDate('');
                      setBatchCompleteNotes('');
                      setBatchCompleteStaffId(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-success">
                    <i className="fas fa-info-circle me-2"></i>
                    Bạn đang ghi nhận hoàn thành cho <strong>{selectedGroup.plans.filter(p => p.isActive).length}</strong> kế hoạch đang hoạt động trong nhóm: <strong>{selectedGroup.title}</strong>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ngày Hoàn Thành <span className="text-danger">*</span></label>
                    <DateInput
                      value={batchCompleteDate}
                      onChange={(value) => setBatchCompleteDate(value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nhân Viên Thực Hiện</label>
                    <select
                      className="form-select"
                      value={batchCompleteStaffId || ''}
                      onChange={(e) => setBatchCompleteStaffId(e.target.value ? parseInt(e.target.value) : null)}
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ghi Chú</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={batchCompleteNotes}
                      onChange={(e) => setBatchCompleteNotes(e.target.value)}
                      placeholder="Nhập ghi chú cho tất cả kế hoạch..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBatchCompleteModal(false);
                      setSelectedGroup(null);
                      setBatchCompleteDate('');
                      setBatchCompleteNotes('');
                      setBatchCompleteStaffId(null);
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleBatchComplete}
                  >
                    <i className="fas fa-check-double me-2"></i>
                    Xác Nhận Hoàn Thành
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Batch Cancel Modal */}
        {showBatchCancelModal && selectedGroup && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Hủy Kế Hoạch Bảo Trì Hàng Loạt</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowBatchCancelModal(false);
                      setSelectedGroup(null);
                      setBatchCancelReason('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Bạn đang hủy <strong>{selectedGroup.plans.filter(p => p.isActive).length}</strong> kế hoạch đang hoạt động trong nhóm: <strong>{selectedGroup.title}</strong>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Lý Do Hủy <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={batchCancelReason}
                      onChange={(e) => setBatchCancelReason(e.target.value)}
                      placeholder="Nhập lý do hủy cho tất cả kế hoạch..."
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowBatchCancelModal(false);
                      setSelectedGroup(null);
                      setBatchCancelReason('');
                    }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleBatchCancel}
                  >
                    <i className="fas fa-times me-2"></i>
                    Xác Nhận Hủy
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Devices Modal */}
        {showAddDevicesModal && selectedGroupForDevices && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-plus-circle me-2"></i>
                    Thêm Thiết Bị Vào Kế Hoạch: {selectedGroupForDevices.title}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddDevicesModal(false);
                      setSelectedGroupForDevices(null);
                      setDevicesToAdd([]);
                      setDeviceSearchKeyword('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    Chọn thiết bị để thêm vào kế hoạch. Các thiết bị đã có trong kế hoạch sẽ không hiển thị trong danh sách này.
                  </div>

                  {/* Search */}
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm kiếm theo tên, serial hoặc ID..."
                      value={deviceSearchKeyword}
                      onChange={(e) => setDeviceSearchKeyword(e.target.value)}
                    />
                  </div>

                  {/* Selected count */}
                  {devicesToAdd.length > 0 && (
                    <div className="alert alert-success mb-3">
                      <i className="fas fa-check-circle me-2"></i>
                      Đã chọn: <strong>{devicesToAdd.length}</strong> thiết bị
                    </div>
                  )}

                  {/* Device list */}
                  {loadingDevices ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                    </div>
                  ) : filteredDevices.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fas fa-inbox fa-3x mb-3"></i>
                      <p>Không tìm thấy thiết bị nào</p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '500px' }}>
                      <table className="table table-hover">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th style={{ width: '50px' }}>
                              <input
                                type="checkbox"
                                checked={filteredDevices.length > 0 && filteredDevices.every((d) =>
                                  devicesToAdd.some((sd) => sd.id === d.id) ||
                                  selectedGroupForDevices.plans.some(p => p.deviceId === d.id)
                                )}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Add all filtered devices that are not already in the group
                                    const existingIds = selectedGroupForDevices.plans.map(p => p.deviceId);
                                    const newDevices = filteredDevices.filter(d => !existingIds.includes(d.id));
                                    setDevicesToAdd([...devicesToAdd, ...newDevices.filter(d => !devicesToAdd.some(sd => sd.id === d.id))]);
                                  } else {
                                    // Remove all filtered devices
                                    setDevicesToAdd(devicesToAdd.filter(d => !filteredDevices.some(fd => fd.id === d.id)));
                                  }
                                }}
                              />
                            </th>
                            <th style={{ width: '50px' }}>ID</th>
                            <th>Tên thiết bị</th>
                            <th>Serial</th>
                            <th>Danh mục</th>
                            <th>Phòng ban</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDevices.map((device) => {
                            const isInGroup = selectedGroupForDevices.plans.some(p => p.deviceId === device.id);
                            const isSelected = devicesToAdd.some((d) => d.id === device.id);
                            return (
                              <tr key={device.id} className={isSelected ? 'table-success' : isInGroup ? 'table-secondary' : ''}>
                                <td>
                                  {isInGroup ? (
                                    <span className="text-muted" title="Đã có trong kế hoạch">
                                      <i className="fas fa-check"></i>
                                    </span>
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        setDevicesToAdd((prev) => {
                                          const exists = prev.find((d) => d.id === device.id);
                                          if (exists) {
                                            // Remove from devicesToAdd
                                            return prev.filter(d => d.id !== device.id);
                                          } else {
                                            // Add to devicesToAdd
                                            return [...prev, device];
                                          }
                                        });
                                      }}
                                    />
                                  )}
                                </td>
                                <td>{device.id}</td>
                                <td>{device.name || '-'}</td>
                                <td>{device.serial || '-'}</td>
                                <td>{device.deviceCategoryName || '-'}</td>
                                <td>{device.departmentName || '-'}</td>
                                <td>
                                  {device.status === 1 && <span className="badge bg-success">Đang sử dụng</span>}
                                  {device.status === 2 && <span className="badge bg-warning">Đang sửa chữa</span>}
                                  {device.status === 3 && <span className="badge bg-danger">Hư hỏng</span>}
                                  {device.status === 4 && <span className="badge bg-secondary">Đã thanh lý</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddDevicesModal(false);
                      setSelectedGroupForDevices(null);
                      setDevicesToAdd([]);
                      setDeviceSearchKeyword('');
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddDevices}
                    disabled={devicesToAdd.length === 0}
                  >
                    <i className="fas fa-check me-2"></i>
                    Thêm ({devicesToAdd.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Remove Devices Modal */}
        {showRemoveDevicesModal && selectedGroupForDevices && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-minus-circle me-2"></i>
                    Bớt Thiết Bị Khỏi Kế Hoạch: {selectedGroupForDevices.title}
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowRemoveDevicesModal(false);
                      setSelectedGroupForDevices(null);
                      setDevicesToRemove([]);
                      setDeviceSearchKeyword('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Chọn thiết bị để xóa khỏi kế hoạch. Chỉ hiển thị các thiết bị đang có trong kế hoạch.
                  </div>

                  {/* Search */}
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm kiếm theo tên, serial hoặc ID..."
                      value={deviceSearchKeyword}
                      onChange={(e) => setDeviceSearchKeyword(e.target.value)}
                    />
                  </div>

                  {/* Selected count */}
                  {devicesToRemove.length > 0 && (
                    <div className="alert alert-danger mb-3">
                      <i className="fas fa-exclamation-circle me-2"></i>
                      Đã chọn: <strong>{devicesToRemove.length}</strong> thiết bị để xóa
                    </div>
                  )}

                  {/* Device list - only show devices in the group */}
                  {loadingDevices ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                    </div>
                  ) : (() => {
                    const groupDeviceIds = selectedGroupForDevices.plans.map(p => p.deviceId);
                    const groupDevices = allDevices.filter(d => groupDeviceIds.includes(d.id));
                    const filtered = deviceSearchKeyword.trim()
                      ? groupDevices.filter(d =>
                        d.name?.toLowerCase().includes(deviceSearchKeyword.toLowerCase()) ||
                        d.serial?.toLowerCase().includes(deviceSearchKeyword.toLowerCase()) ||
                        d.id.toString().includes(deviceSearchKeyword)
                      )
                      : groupDevices;

                    return filtered.length === 0 ? (
                      <div className="text-center py-5 text-muted">
                        <i className="fas fa-inbox fa-3x mb-3"></i>
                        <p>Không tìm thấy thiết bị nào</p>
                      </div>
                    ) : (
                      <div className="table-responsive" style={{ maxHeight: '500px' }}>
                        <table className="table table-hover">
                          <thead className="table-light sticky-top">
                            <tr>
                              <th style={{ width: '50px' }}>
                                <input
                                  type="checkbox"
                                  checked={filtered.length > 0 && filtered.every((d) =>
                                    devicesToRemove.some((sd) => sd.id === d.id)
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setDevicesToRemove([...devicesToRemove, ...filtered.filter(d => !devicesToRemove.some(sd => sd.id === d.id))]);
                                    } else {
                                      setDevicesToRemove(devicesToRemove.filter(d => !filtered.some(fd => fd.id === d.id)));
                                    }
                                  }}
                                />
                              </th>
                              <th style={{ width: '50px' }}>ID</th>
                              <th>Tên thiết bị</th>
                              <th>Serial</th>
                              <th>Danh mục</th>
                              <th>Phòng ban</th>
                              <th>Trạng thái</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((device) => {
                              const isSelected = devicesToRemove.some((d) => d.id === device.id);
                              return (
                                <tr key={device.id} className={isSelected ? 'table-danger' : ''}>
                                  <td>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        if (isSelected) {
                                          setDevicesToRemove(devicesToRemove.filter(d => d.id !== device.id));
                                        } else {
                                          setDevicesToRemove([...devicesToRemove, device]);
                                        }
                                      }}
                                    />
                                  </td>
                                  <td>{device.id}</td>
                                  <td>{device.name || '-'}</td>
                                  <td>{device.serial || '-'}</td>
                                  <td>{device.deviceCategoryName || '-'}</td>
                                  <td>{device.departmentName || '-'}</td>
                                  <td>
                                    {device.status === 1 && <span className="badge bg-success">Đang sử dụng</span>}
                                    {device.status === 2 && <span className="badge bg-warning">Đang sửa chữa</span>}
                                    {device.status === 3 && <span className="badge bg-danger">Hư hỏng</span>}
                                    {device.status === 4 && <span className="badge bg-secondary">Đã thanh lý</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowRemoveDevicesModal(false);
                      setSelectedGroupForDevices(null);
                      setDevicesToRemove([]);
                      setDeviceSearchKeyword('');
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleRemoveDevices}
                    disabled={devicesToRemove.length === 0}
                  >
                    <i className="fas fa-trash me-2"></i>
                    Xóa ({devicesToRemove.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Start Maintenance Modal */}
        {showStartModal && selectedEvent && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-play-circle me-2"></i>
                    Bắt Đầu Bảo Trì
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowStartModal(false);
                      setSelectedEvent(null);
                      setStartNotes('');
                      setStartStaffId(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-info mb-3">
                    <i className="fas fa-info-circle me-2"></i>
                    Xác nhận bắt đầu bảo trì cho thiết bị này.
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Thiết Bị</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedEvent.deviceName || `Thiết bị #${selectedEvent.deviceId}`}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tiêu Đề</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedEvent.title || '-'}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nhân Viên Thực Hiện</label>
                    <select
                      className="form-select"
                      value={startStaffId || ''}
                      onChange={(e) => setStartStaffId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ghi Chú</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={startNotes}
                      onChange={(e) => setStartNotes(e.target.value)}
                      placeholder="Nhập ghi chú khi bắt đầu bảo trì..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowStartModal(false);
                      setSelectedEvent(null);
                      setStartNotes('');
                      setStartStaffId(null);
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStartMaintenance}
                  >
                    <i className="fas fa-play me-2"></i>
                    Bắt Đầu Bảo Trì
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Complete Maintenance Modal */}
        {showCompleteModal && selectedEvent && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-check-circle me-2"></i>
                    Ghi Nhận Bảo Trì Hoàn Thành
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowCompleteModal(false);
                      setSelectedEvent(null);
                      setCompleteDate('');
                      setCompleteNotes('');
                      setCompleteStaffId(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Thiết Bị</label>
                    <input
                      type="text"
                      className="form-control"
                      value={selectedEvent.deviceName || `Thiết bị #${selectedEvent.deviceId}`}
                      disabled
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label text-muted small mb-1">Tiêu Đề</label>
                    <div className="fw-bold">{getShortTitle(selectedEvent.title)}</div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ngày Hoàn Thành <span className="text-danger">*</span></label>
                    <DateInput
                      value={completeDate}
                      onChange={(value) => setCompleteDate(value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nhân Viên Thực Hiện</label>
                    <select
                      className="form-select"
                      value={completeStaffId || ''}
                      onChange={(e) => setCompleteStaffId(e.target.value ? Number(e.target.value) : null)}
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {staffList.map((staff) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Ghi Chú</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={completeNotes}
                      onChange={(e) => setCompleteNotes(e.target.value)}
                      placeholder="Nhập ghi chú về việc bảo trì..."
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowCompleteModal(false);
                      setSelectedEvent(null);
                      setCompleteDate('');
                      setCompleteNotes('');
                      setCompleteStaffId(null);
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleCompleteMaintenance}
                  >
                    <i className="fas fa-check me-2"></i>
                    Xác Nhận Hoàn Thành
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Device Selection Modal */}
        {showDeviceModal && (
          <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-xl">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="fas fa-search me-2"></i>
                    Tìm kiếm và chọn thiết bị
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowDeviceModal(false);
                      setDeviceSearchKeyword('');
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  {/* Search */}
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Tìm kiếm theo tên, serial hoặc ID..."
                      value={deviceSearchKeyword}
                      onChange={(e) => setDeviceSearchKeyword(e.target.value)}
                    />
                  </div>

                  {/* Selected count */}
                  {selectedDevices.length > 0 && (
                    <div className="alert alert-info mb-3">
                      <i className="fas fa-check-circle me-2"></i>
                      Đã chọn: <strong>{selectedDevices.length}</strong> thiết bị
                    </div>
                  )}

                  {/* Device list */}
                  {loadingDevices ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                      </div>
                    </div>
                  ) : filteredDevices.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <i className="fas fa-inbox fa-3x mb-3"></i>
                      <p>Không tìm thấy thiết bị nào</p>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '500px' }}>
                      <table className="table table-hover">
                        <thead className="table-light sticky-top">
                          <tr>
                            <th style={{ width: '50px' }}>
                              <input
                                type="checkbox"
                                checked={filteredDevices.length > 0 && filteredDevices.every((d) =>
                                  selectedDevices.some((sd) => sd.id === d.id)
                                )}
                                onChange={handleSelectAllDevices}
                              />
                            </th>
                            <th style={{ width: '50px' }}>ID</th>
                            <th>Tên thiết bị</th>
                            <th>Serial</th>
                            <th>Danh mục</th>
                            <th>Phòng ban</th>
                            <th>Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDevices.map((device) => {
                            const isSelected = selectedDevices.some((d) => d.id === device.id);
                            return (
                              <tr key={device.id} className={isSelected ? 'table-primary' : ''}>
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleDeviceCheckboxChange(device)}
                                  />
                                </td>
                                <td>{device.id}</td>
                                <td>{device.name || '-'}</td>
                                <td>{device.serial || '-'}</td>
                                <td>{device.deviceCategoryName || '-'}</td>
                                <td>{device.departmentName || '-'}</td>
                                <td>
                                  {device.status === 1 && <span className="badge bg-success">Đang sử dụng</span>}
                                  {device.status === 2 && <span className="badge bg-warning">Đang sửa chữa</span>}
                                  {device.status === 3 && <span className="badge bg-danger">Hư hỏng</span>}
                                  {device.status === 4 && <span className="badge bg-secondary">Đã thanh lý</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowDeviceModal(false);
                      setDeviceSearchKeyword('');
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleConfirmDeviceSelection}
                  >
                    <i className="fas fa-check me-2"></i>
                    Xác nhận ({selectedDevices.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <ExportModal
          show={showExportModal}
          onClose={() => setShowExportModal(false)}
          title={exportTitle}
          apiEndpoint={exportParams.batchId ? `/maintenance-plans/${exportParams.batchId}/export` : ''}
          params={exportParams}
          defaultFileName="Lich_su_bao_tri"
        />

        <QuickViewReportModal
          isOpen={showQuickView}
          reportId={selectedQuickReportId || 0}
          onClose={() => setShowQuickView(false)}
        />
      </div>
    </>
  );
}

export default function MaintenancePage() {
  return (
    <AdminRoute>
      <MaintenancePageContent />
    </AdminRoute>
  );
}

