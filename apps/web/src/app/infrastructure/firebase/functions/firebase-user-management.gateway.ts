import { Injectable, inject } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import type {
  CreateUserInput,
  UserManagementGateway,
} from '../../../features/users/domain/user-management.gateway';
import { FIREBASE_FUNCTIONS } from '../firebase.tokens';

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

  async createUser(data: CreateUserInput): Promise<string> {
    const createUser = httpsCallable<CreateUserInput, CreateUserResponse>(
      this.functions,
      'createUser',
    );
    const { data: response } = await createUser(data);
    return response.uid;
  }

  async deleteUser(uid: string): Promise<void> {
    const deleteUser = httpsCallable<{ uid: string }, DeleteUserResponse>(
      this.functions,
      'deleteUser',
    );
    await deleteUser({ uid });
  }
}
