import { Injectable, inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { sendPasswordResetEmail } from 'firebase/auth';
import type {
  CreateUserInput,
  InviteClientUserInput,
  InviteInternalUserInput,
  ReplaceClientUserInput,
  SetClientUserStatusInput,
  UpdateInternalUserInput,
  UserManagementGateway,
} from '../../../features/users/domain/user-management.gateway';
import type { UserStatus } from '../../../core/models/app-user.model';
import { FIREBASE_AUTH, FIREBASE_FUNCTIONS } from '../firebase.tokens';

interface CreateUserResponse {
  uid: string;
}

interface DeleteUserResponse {
  uid: string;
}

/** Adapter de `UserManagementGateway` sobre las Cloud Functions callables
 *  `createUser`/`deleteUser` (Admin SDK — ver `functions/src/index.ts`). */
@Injectable({ providedIn: 'root' })
export class FirebaseUserManagementGateway implements UserManagementGateway {
  private readonly functions = inject(FIREBASE_FUNCTIONS);
  private readonly auth = inject(FIREBASE_AUTH);

  async createUser(data: CreateUserInput): Promise<string> {
    const createUser = httpsCallable<CreateUserInput, CreateUserResponse>(
      this.functions,
      'createUser',
    );
    const { data: response } = await createUser(data);
    return response.uid;
  }

  async inviteInternalUser(data: InviteInternalUserInput): Promise<string> {
    const inviteUser = httpsCallable<InviteInternalUserInput, CreateUserResponse>(
      this.functions,
      'inviteInternalUser',
    );
    const { data: response } = await inviteUser(data);
    return response.uid;
  }

  async updateInternalUser(data: UpdateInternalUserInput): Promise<void> {
    const updateUser = httpsCallable<UpdateInternalUserInput, { uid: string }>(
      this.functions,
      'updateInternalUser',
    );
    await updateUser(data);
  }

  async inviteClientUser(data: InviteClientUserInput): Promise<string> {
    const inviteUser = httpsCallable<InviteClientUserInput, CreateUserResponse>(
      this.functions,
      'inviteClientUser',
    );
    const { data: response } = await inviteUser(data);
    return response.uid;
  }

  async replaceClientUser(data: ReplaceClientUserInput): Promise<string> {
    const replaceUser = httpsCallable<ReplaceClientUserInput, CreateUserResponse>(
      this.functions,
      'replaceClientUser',
    );
    const { data: response } = await replaceUser(data);
    return response.uid;
  }

  async setClientUserStatus(data: SetClientUserStatusInput): Promise<void> {
    const setStatus = httpsCallable<SetClientUserStatusInput, { uid: string; status: UserStatus }>(
      this.functions,
      'setClientUserStatus',
    );
    await setStatus(data);
  }

  async setUserStatus(uid: string, status: UserStatus): Promise<void> {
    const setStatus = httpsCallable<{ uid: string; status: UserStatus }, { uid: string }>(
      this.functions,
      'setUserStatus',
    );
    await setStatus({ uid, status });
  }

  sendAccessEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async deleteUser(uid: string): Promise<void> {
    const deleteUser = httpsCallable<{ uid: string }, DeleteUserResponse>(
      this.functions,
      'deleteUser',
    );
    await deleteUser({ uid });
  }
}
