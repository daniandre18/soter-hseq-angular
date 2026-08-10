import type { Provider } from '@angular/core';
import { AUTH_REPOSITORY } from '../../core/repositories/auth.repository';
import { USERS_REPOSITORY } from '../../core/repositories/users.repository';
import { SETTINGS_REPOSITORY } from '../../core/repositories/settings.repository';
import { CLIENT_REPOSITORY } from '../../features/clients/domain/client.repository';
import { CLIENT_TAG_REPOSITORY } from '../../features/clients/domain/client-tag.repository';
import { NOTIFICATION_REPOSITORY } from '../../features/notifications/domain/notification.repository';
import { QUOTE_REPOSITORY } from '../../features/quotes/domain/quote.repository';
import { SERVICE_REPOSITORY } from '../../features/services/domain/service.repository';
import { SERVICE_CATEGORY_REPOSITORY } from '../../features/services/domain/service-category.repository';
import { USER_MANAGEMENT_GATEWAY } from '../../features/users/domain/user-management.gateway';
import { ORDER_REPOSITORY } from '../../features/orders/domain/order.repository';
import { EVIDENCE_UPLOAD_GATEWAY } from '../../features/orders/domain/evidence-upload.gateway';
import { CLOSING_ACT_GATEWAY } from '../../features/orders/domain/closing-act.gateway';
import { LOGO_UPLOAD_GATEWAY } from '../../features/settings/domain/logo-upload.gateway';
import { FirebaseAuthRepository } from './auth/firebase-auth.repository';
import { FirebaseUsersRepository } from './repositories/firebase-users.repository';
import { FirebaseSettingsRepository } from './repositories/firebase-settings.repository';
import { FirebaseClientRepository } from './repositories/firebase-client.repository';
import { FirebaseClientTagRepository } from './repositories/firebase-client-tag.repository';
import { FirebaseNotificationRepository } from './repositories/firebase-notification.repository';
import { FirebaseQuoteRepository } from './repositories/firebase-quote.repository';
import { FirebaseServiceRepository } from './repositories/firebase-service.repository';
import { FirebaseServiceCategoryRepository } from './repositories/firebase-service-category.repository';
import { FirebaseOrderRepository } from './repositories/firebase-order.repository';
import { FirebaseUserManagementGateway } from './functions/firebase-user-management.gateway';
import { FirebaseEvidenceUploadGateway } from './functions/firebase-evidence-upload.gateway';
import { FirebaseClosingActGateway } from './functions/firebase-closing-act.gateway';
import { FirebaseLogoUploadGateway } from './functions/firebase-logo-upload.gateway';

/**
 * Enlaza cada puerto (`*_REPOSITORY`/`*_GATEWAY`, definidos junto a su
 * interfaz en `core/repositories/` o en el `domain/` de cada feature) con
 * su adapter de Firebase. Es el único lugar del proyecto que sabe que el
 * backend de hoy es Firebase — cambiar de proveedor en el futuro implica
 * reemplazar los `useClass` de aquí, no tocar componentes, facades ni
 * casos de uso.
 */
export const repositoryProviders: Provider[] = [
  { provide: AUTH_REPOSITORY, useClass: FirebaseAuthRepository },
  { provide: USERS_REPOSITORY, useClass: FirebaseUsersRepository },
  { provide: CLIENT_REPOSITORY, useClass: FirebaseClientRepository },
  { provide: CLIENT_TAG_REPOSITORY, useClass: FirebaseClientTagRepository },
  { provide: NOTIFICATION_REPOSITORY, useClass: FirebaseNotificationRepository },
  { provide: QUOTE_REPOSITORY, useClass: FirebaseQuoteRepository },
  { provide: SERVICE_REPOSITORY, useClass: FirebaseServiceRepository },
  { provide: SERVICE_CATEGORY_REPOSITORY, useClass: FirebaseServiceCategoryRepository },
  { provide: USER_MANAGEMENT_GATEWAY, useClass: FirebaseUserManagementGateway },
  { provide: ORDER_REPOSITORY, useClass: FirebaseOrderRepository },
  { provide: EVIDENCE_UPLOAD_GATEWAY, useClass: FirebaseEvidenceUploadGateway },
  { provide: CLOSING_ACT_GATEWAY, useClass: FirebaseClosingActGateway },
  { provide: SETTINGS_REPOSITORY, useClass: FirebaseSettingsRepository },
  { provide: LOGO_UPLOAD_GATEWAY, useClass: FirebaseLogoUploadGateway },
];
