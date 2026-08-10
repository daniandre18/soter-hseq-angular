import type { AppUser } from '../../../core/models/app-user.model';
import type {
  InviteClientUserInput,
  ReplaceClientUserInput,
} from '../../users/domain/user-management.gateway';

export type ClientPortalUser = AppUser & { role: 'VIEWER'; clientId: string };

export function isClientPortalUser(user: AppUser): user is ClientPortalUser {
  return user.role === 'VIEWER' && typeof user.clientId === 'string' && !!user.clientId;
}

export type NewClientPortalUser = InviteClientUserInput;
export type ReplacementClientPortalUser = ReplaceClientUserInput;

export interface ClientPortalInvitationResult {
  uid: string;
  invitationSent: boolean;
}
