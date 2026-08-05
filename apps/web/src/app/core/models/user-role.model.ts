export type UserRole = 'ADMIN' | 'COMMERCIAL' | 'COORDINATOR' | 'TECHNICIAN' | 'VIEWER';

export const USER_ROLES: readonly UserRole[] = [
  'ADMIN',
  'COMMERCIAL',
  'COORDINATOR',
  'TECHNICIAN',
  'VIEWER',
];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  COMMERCIAL: 'Comercial',
  COORDINATOR: 'Coordinador',
  TECHNICIAN: 'Técnico',
  VIEWER: 'Cliente',
};
