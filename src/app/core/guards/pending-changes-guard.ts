import { CanActivateFn } from '@angular/router';

export const pendingChangesGuard: CanActivateFn = (route, state) => {
  return true;
};
