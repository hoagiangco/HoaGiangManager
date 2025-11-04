// User types
export interface User {
  id: string;
  userName: string;
  email: string;
  fullName?: string;
  createdDate?: Date;
  roles: string[];
}

// Department types
export interface Department {
  id: number;
  name: string;
}

// DeviceCategory types
export interface DeviceCategory {
  id: number;
  name: string;
  displayOrder?: number;
}

// Device types
export enum DeviceStatus {
  DangSuDung = 1,
  DangSuaChua = 2,
  HuHong = 3,
  DaThanhLy = 4
}

export interface Device {
  id: number;
  name: string;
  serial?: string;
  description?: string;
  img?: string;
  warrantyDate?: Date;
  useDate?: Date;
  endDate?: Date;
  departmentId: number;
  deviceCategoryId: number;
  status: DeviceStatus;
}

export interface DeviceVM extends Device {
  departmentName?: string;
  deviceCategoryName?: string;
  statusName?: string;
}

// Staff types
export interface Staff {
  id: number;
  name: string;
  gender?: boolean;
  birthday?: Date;
  departmentId?: number;
}

export interface StaffVM extends Staff {
  departmentName?: string;
}

// EventType types
export interface EventType {
  id: number;
  name: string;
}

// Event types
export interface Event {
  id: number;
  name?: string;
  deviceId?: number;
  eventTypeId?: number;
  description: string;
  img?: string;
  startDate?: Date;
  finishDate: Date;
  staffId?: number;
  notes: string;
  newDeviceStatus?: DeviceStatus;
}

export interface EventVM extends Event {
  deviceName?: string;
  eventTypeName?: string;
  staffName?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  status: boolean;
  data?: T;
  error?: string;
  message?: string;
}

