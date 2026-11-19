import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../../services/auth/auth';

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) return true; 

  const user = auth.getUser();
  const userRole = user?.role?.toUpperCase();
  const expectedRole = route.data['role'];

  const allowedRoles = Array.isArray(expectedRole) 
    ? expectedRole.map(r => r.toUpperCase()) 
    : [expectedRole.toUpperCase()];

  console.group('%c🛡️ DIAGNÓSTICO GUARD', 'background: #222; color: #bada55');
  console.log('Ruta intentada:', state.url);
  console.log('Rol en sesión:', userRole);
  console.log('Rol esperado:', expectedRole);
  console.groupEnd();

  if (!auth.isAuthenticated()) {
    console.error('🚫 Guard: No autenticado, al login.');
    router.navigate(['/auth/login']);
    return false;
  }

  if (userRole && allowedRoles.includes(userRole)) {
    console.log('✅ Guard: Acceso PERMITIDO. Cargando componente...');
    return true; 
  }

  const redirectMap: Record<string, string> = {
    'ADMIN': '/admin/dashboard',
    'CLIENTE': '/client/dashboard'
  };

  const target = userRole ? (redirectMap[userRole] || '/catalog') : '/auth/login';
  console.warn(`🔀 Guard: Rol incorrecto. Redirigiendo a: ${target}`);
  router.navigate([target]);
  return false;
};