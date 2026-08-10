import { Injectable, inject } from '@angular/core';
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
import { FIREBASE_AUTH } from '../firebase.tokens';
import { firebaseCallable } from './firebase-callable';

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
  private readonly auth = inject(FIREBASE_AUTH);

  async createUser(data: CreateUserInput): Promise<string> {
    const createUser = await firebaseCallable<CreateUserInput, CreateUserResponse>('createUser');
    const { data: response } = await createUser(data);
    return response.uid;
  }

  async inviteInternalUser(data: InviteInternalUserInput): Promise<string> {
    const inviteUser = await firebaseCallable<InviteInternalUserInput, CreateUserResponse>(
      'inviteInternalUser',
    );
    const { data: response } = await inviteUser(data);
    return response.uid;
  }

  async updateInternalUser(data: UpdateInternalUserInput): Promise<void> {
    const updateUser = await firebaseCallable<UpdateInternalUserInput, { uid: string }>(
      'updateInternalUser',
    );
    await updateUser(data);
  }

  async inviteClientUser(data: InviteClientUserInput): Promise<string> {
    const inviteUser = await firebaseCallable<InviteClientUserInput, CreateUserResponse>(
      'inviteClientUser',
    );
    const { data: response } = await inviteUser(data);
    return response.uid;
  }

  async replaceClientUser(data: ReplaceClientUserInput): Promise<string> {
    const replaceUser = await firebaseCallable<ReplaceClientUserInput, CreateUserResponse>(
      'replaceClientUser',
    );
    const { data: response } = await replaceUser(data);
    return response.uid;
  }

  async setClientUserStatus(data: SetClientUserStatusInput): Promise<void> {
    const setStatus = await firebaseCallable<
      SetClientUserStatusInput,
      { uid: string; status: UserStatus }
    >('setClientUserStatus');
    await setStatus(data);
  }

  async setUserStatus(uid: string, status: UserStatus): Promise<void> {
    const setStatus = await firebaseCallable<
      { uid: string; status: UserStatus },
      { uid: string }
    >('setUserStatus');
    await setStatus({ uid, status });
  }

  sendAccessEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async deleteUser(uid: string): Promise<void> {
    const deleteUser = await firebaseCallable<{ uid: string }, DeleteUserResponse>('deleteUser');
    await deleteUser({ uid });
  }
}
