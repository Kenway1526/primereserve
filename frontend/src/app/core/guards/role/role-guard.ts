import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, CanActivateFn } from '@angular/router';
import { Auth } from '../../services/auth/auth';

export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Si estamos en el servidor, permitimos el paso inicial para evitar el "Cannot GET"
  if (!isPlatformBrowser(platformId)) return true;

  const expectedRole = route.data['role'];
  const userRole = auth.getRole();

  if (userRole === expectedRole) {
    return true;
  }

  router.navigate(['/home/login']);
  return false;
};