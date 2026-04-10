import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Verificamos si el usuario está autenticado en el servicio
  if (auth.isAuthenticated()) {
    return true;
  }

  // Si no está autenticado, lo mandamos al login
  console.warn('AuthGuard: Usuario no autenticado, redireccionando...');
  router.navigate(['/auth/login']);
  return false;
};