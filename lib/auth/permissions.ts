// Permission and role utilities

export enum Role {
  SuperAdmin = 'SuperAdmin',
  Admin = 'Admin',
  Supervisor = 'Supervisor',
  User = 'User',
}

export interface UserPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUpdateStatus?: boolean; // For users to update status only
  canExecute?: boolean; // Cho phép thực hiện bảo trì
}

export function hasRole(userRoles: string[] | undefined, role: Role | string): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes(role);
}

// Role Hierarchy Helpers
export function isSuperAdmin(userRoles: string[] | undefined): boolean {
  return hasRole(userRoles, Role.SuperAdmin);
}

export function isAdmin(userRoles: string[] | undefined): boolean {
  return isSuperAdmin(userRoles) || hasRole(userRoles, Role.Admin);
}

export function isSupervisor(userRoles: string[] | undefined): boolean {
  return isAdmin(userRoles) || hasRole(userRoles, Role.Supervisor);
}

export function isUser(userRoles: string[] | undefined): boolean {
  return isSupervisor(userRoles) || hasRole(userRoles, Role.User);
}

// Lấy role cao nhất (khi có nhiều role)
export function getEffectiveRole(userRoles: string[] | undefined): string | null {
  if (!userRoles || userRoles.length === 0) return null;
  if (hasRole(userRoles, Role.SuperAdmin)) return Role.SuperAdmin;
  if (hasRole(userRoles, Role.Admin)) return Role.Admin;
  if (hasRole(userRoles, Role.Supervisor)) return Role.Supervisor;
  if (hasRole(userRoles, Role.User)) return Role.User;
  return userRoles[0]; // Fallback
}

// Component-specific permissions
export function getDamageReportPermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  const user = isUser(userRoles);
  
  return {
    canView: user, // Cả User/Supervisor/Admin đều xem được (logic filter nằm ở backend)
    canCreate: user, // Ai cũng được tạo báo cáo
    canEdit: admin, // Chỉ admin can edit toàn bộ
    canDelete: admin, // Chỉ admin can delete
    canUpdateStatus: user, // User/Supervisor tự cập nhật (chặn bằng handlerId ở UI)
  };
}

export function getDevicePermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  const user = isUser(userRoles);
  
  return {
    canView: user, // User/Supervisor lấy list device để chọn lúc báo cáo (GET-only)
    canCreate: admin, // User KHÔNG ĐƯỢC
    canEdit: admin, // User KHÔNG ĐƯỢC
    canDelete: admin, // User KHÔNG ĐƯỢC
  };
}

export function getStaffPermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  
  return {
    canView: admin,
    canCreate: admin,
    canEdit: admin,
    canDelete: admin,
  };
}

export function getDepartmentPermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  
  return {
    canView: admin,
    canCreate: admin,
    canEdit: admin,
    canDelete: admin,
  };
}

export function getEventTypePermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  
  return {
    canView: admin,
    canCreate: admin,
    canEdit: admin,
    canDelete: admin,
  };
}

export function getDeviceCategoryPermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  
  return {
    canView: admin,
    canCreate: admin,
    canEdit: admin,
    canDelete: admin,
  };
}

export function getEventPermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  const user = isUser(userRoles);
  
  return {
    canView: user,
    canCreate: admin, // User KHÔNG ĐƯỢC
    canEdit: admin, // User KHÔNG ĐƯỢC
    canDelete: admin, // User KHÔNG ĐƯỢC
  };
}

export function getMaintenancePermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  const user = isUser(userRoles);
  
  return {
    canView: user,
    canCreate: admin, // User KHÔNG ĐƯỢC
    canEdit: admin, // User KHÔNG ĐƯỢC
    canDelete: admin, // User KHÔNG ĐƯỢC
    canExecute: user, // User được bấm Hoàn thành bảo trì
  };
}

export function getAdminPermissions(userRoles: string[] | undefined): UserPermissions {
  const admin = isAdmin(userRoles);
  
  return {
    canView: admin,
    canCreate: admin,
    canEdit: admin,
    canDelete: admin,
  };
}




