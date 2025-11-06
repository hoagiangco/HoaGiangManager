// Permission and role utilities

export enum Role {
  Admin = 'Admin',
  User = 'User',
}

export interface UserPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canUpdateStatus?: boolean; // For users to update status only
}

export function hasRole(userRoles: string[] | undefined, role: Role | string): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return userRoles.includes(role);
}

export function hasAnyRole(userRoles: string[] | undefined, roles: (Role | string)[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return roles.some(role => userRoles.includes(role));
}

export function hasAllRoles(userRoles: string[] | undefined, roles: (Role | string)[]): boolean {
  if (!userRoles || userRoles.length === 0) return false;
  return roles.every(role => userRoles.includes(role));
}

export function isAdmin(userRoles: string[] | undefined): boolean {
  return hasRole(userRoles, Role.Admin);
}

export function isUser(userRoles: string[] | undefined): boolean {
  return hasRole(userRoles, Role.User);
}

// Component-specific permissions
export function getDamageReportPermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  const isUserRole = isUser(userRoles);
  
  return {
    canView: isAdminUser || isUserRole,
    canCreate: isAdminUser || isUserRole,
    canEdit: isAdminUser, // Only admin can edit
    canDelete: isAdminUser, // Only admin can delete
    canUpdateStatus: isAdminUser || isUserRole, // Both admin and user can update status
  };
}

export function getDevicePermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  const isUserRole = isUser(userRoles);
  
  return {
    canView: isAdminUser || isUserRole,
    canCreate: isAdminUser || isUserRole,
    canEdit: isAdminUser || isUserRole,
    canDelete: isAdminUser || isUserRole,
  };
}

export function getStaffPermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  
  return {
    canView: isAdminUser,
    canCreate: isAdminUser,
    canEdit: isAdminUser,
    canDelete: isAdminUser,
  };
}

export function getDepartmentPermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  
  return {
    canView: isAdminUser,
    canCreate: isAdminUser,
    canEdit: isAdminUser,
    canDelete: isAdminUser,
  };
}

export function getEventTypePermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  
  return {
    canView: isAdminUser,
    canCreate: isAdminUser,
    canEdit: isAdminUser,
    canDelete: isAdminUser,
  };
}

export function getDeviceCategoryPermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  
  return {
    canView: isAdminUser,
    canCreate: isAdminUser,
    canEdit: isAdminUser,
    canDelete: isAdminUser,
  };
}

export function getEventPermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  const isUserRole = isUser(userRoles);
  
  return {
    canView: isAdminUser || isUserRole,
    canCreate: isAdminUser || isUserRole,
    canEdit: isAdminUser || isUserRole,
    canDelete: isAdminUser || isUserRole,
  };
}

export function getAdminPermissions(userRoles: string[] | undefined): UserPermissions {
  const isAdminUser = isAdmin(userRoles);
  
  return {
    canView: isAdminUser,
    canCreate: isAdminUser,
    canEdit: isAdminUser,
    canDelete: isAdminUser,
  };
}




