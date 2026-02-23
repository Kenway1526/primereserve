import { Routes } from '@angular/router';

// Componentes de Acceso
import { Dashboard2Component } from './modules/dashboard-2/dashboard-2.component';
import { Login2Component } from './modules/auth/login-2/login-2.component';
import { RegistroComponent } from './modules/auth/registro/registro.component';

// Dashboards por Rol
import { DashboardClienteComponent } from './modules/cliente/dashboard-cliente/dashboard-cliente.component';
import { DashboardAdminComponent } from './modules/admin/dashboard-admin/dashboard-admin.component';
import { DashboardMeserosComponent } from './modules/meseros/dashboard-meseros/dashboard-meseros.component';
import { DashboardCocinaComponent } from './modules/cocina/dashboard-cocina/dashboard-cocina.component';

export const routes: Routes = [
  // --- ACCESO PÚBLICO ---
  { 
    path: 'dashboard-2', 
    component: Dashboard2Component,
    children: [
      { path: 'registro', component: RegistroComponent } // Embebido en Dashboard 2
    ]
  },
  { path: 'login-2', component: Login2Component },

  // --- ÁREA CLIENTE ---
  { 
    path: 'cliente', 
    component: DashboardClienteComponent,
    children: [
      { path: 'reservas', loadComponent: () => import('./modules/cliente/reservas/reservas.component').then(m => m.ReservasComponent) },
      { path: 'menu', loadComponent: () => import('./modules/cliente/menu/menu.component').then(m => m.MenuComponent) },
      { path: 'lista-espera', loadComponent: () => import('./modules/cliente/lista-espera/lista-espera.component').then(m => m.ListaEsperaComponent) }
    ]
  },

  // --- ÁREA ADMINISTRADOR ---
  { 
    path: 'admin', 
    component: DashboardAdminComponent,
    children: [
      { path: 'gestion', loadComponent: () => import('./modules/admin/gestion-reserva/gestion-reserva.component').then(m => m.GestionReservaComponent) },
      { path: 'reportes', loadComponent: () => import('./modules/admin/reportes/reportes.component').then(m => m.ReportesComponent) }
    ]
  },

  // --- ÁREA MESEROS ---
  { 
    path: 'meseros', 
    component: DashboardMeserosComponent,
    children: [
      { path: 'atender', loadComponent: () => import('./modules/meseros/atender-reservas/atender-reservas.component').then(m => m.AtenderReservasComponent) }
    ]
  },

  // --- ÁREA COCINA ---
  { 
    path: 'cocina', 
    component: DashboardCocinaComponent,
    children: [
      { path: 'pedidos', loadComponent: () => import('./modules/cocina/lista-pedidos/lista-pedidos.component').then(m => m.ListaPedidosComponent) },
      { path: 'actualizar-menu', loadComponent: () => import('./modules/cocina/actualizar-menu/actualizar-menu.component').then(m => m.ActualizarMenuComponent) }
    ]
  },

  // --- REDIRECCIONES ---
  { path: '', redirectTo: '/dashboard-2', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard-2' }
];