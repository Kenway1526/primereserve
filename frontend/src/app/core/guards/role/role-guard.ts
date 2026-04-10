import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, UserRole } from '../../services/auth/auth';

// core/guards/role.guard.ts

export const roleGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  // Verificación de autenticación
  if (!auth.isAuthenticated()) {
    console.warn('[RoleGuard] Bloqueado: Usuario no autenticado.');
    router.navigate(['/auth/login']);
    return false;
  }

  const userRole = auth.getRole();
  const expectedRole = route.data['role'] as UserRole;

  console.log(`%c [RoleGuard] Destino: ${state.url} | Esperado: ${expectedRole} | Usuario: ${userRole}`, 'color: #8e44ad; font-weight: bold;');

  if (userRole === expectedRole) {
    return true;
  }

  // Si el rol es incorrecto
  console.error(`[RoleGuard] Permiso insuficiente. Requerido: ${expectedRole}, Tienes: ${userRole}`);
  
  // Redirección de escape
  if (userRole === 'ADMIN') router.navigate(['/admin/dashboard']);
  else if (userRole === 'WAITER') router.navigate(['/mesero/mapa']);
  else router.navigate(['/catalog']); // <--- Aquí es donde te mandaba por la asincronía
  
  return false;
};