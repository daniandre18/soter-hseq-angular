import type { AppUser } from '../../../core/models/app-user.model';
import type {
  InternalUserRole,
  InviteInternalUserInput,
  UpdateInternalUserInput,
} from '../domain/user-management.gateway';

export const INTERNAL_USER_ROLES: readonly InternalUserRole[] = [
  'ADMIN',
  'COORDINATOR',
  'COMMERCIAL',
];

export function isInternalUser(user: AppUser): boolean {
  return INTERNAL_USER_ROLES.includes(user.role as InternalUserRole);
}

export type NewInternalUserData = InviteInternalUserInput;
export type InternalUserUpdate = Omit<UpdateInternalUserInput, 'uid'>;

export interface InviteInternalUserResult {
  uid: string;
  invitationSent: boolean;
}
