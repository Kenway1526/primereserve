import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  const userRole = auth.getRole(); // Asegúrate que tu servicio Auth tenga este método
  const expectedRole = route.data['expectedRole'];

  if (auth.isAuthenticated() && userRole === expectedRole) {
    return true;
  }

  console.error(`Acceso denegado: Se esperaba ${expectedRole} y se tiene ${userRole}`);
  router.navigate(['/auth/login']);
  return false;
};