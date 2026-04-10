import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role/role-guard';
import { AdminComponent } from './modules/admin/admin.component';

export const routes: Routes = [
  // 1. REDIRECCIÓN INICIAL
  { 
    path: '', 
    redirectTo: 'catalog', 
    pathMatch: 'full' 
  },
  
  { 
    path: 'catalog', 
    loadComponent: () => import('./modules/home/restaurant-catalog/restaurant-catalog').then(m => m.RestaurantCatalog) 
  },
  { 
    path: 'reservar', 
    loadComponent: () => import('./modules/home/new-reservation/new-reservation').then(m => m.NewReservation) 
  },

  // 3. AUTENTICACIÓN (NUNCA debe llevar Guard)
  {
    path: 'auth',
    children: [
      { 
        path: 'seleccion', 
        loadComponent: () => import('./modules/auth/restaurant-select/restaurant-select').then(m => m.RestaurantSelect) 
      },
      { 
        path: 'login', 
        loadComponent: () => import('./modules/auth/login/login').then(m => m.Login) 
      }
    ]
  },

  // 4. RUTA CLIENTE (Acceso por Folio)
  {
    path: 'client',
    canActivate: [roleGuard],
    data: { role: 'CLIENTE' }, // Cambiado a CLIENTE para coincidir con tu servicio Auth
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./modules/client/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'reserve', loadComponent: () => import('./modules/client/reservation-stepper/reservation-stepper').then(m => m.ReservationStepper) },
      { path: 'menu', loadComponent: () => import('./modules/client/menu-view/menu-view').then(m => m.MenuView) }
    ]
  },

  // 5. RUTA ADMIN (Usa el AdminComponent como Layout)
  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    children: [
      { path: 'dashboard', loadComponent: () => import('./modules/admin/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'inventory-mgmt', loadComponent: () => import('./modules/admin/inventory-mgmt/inventory-mgmt').then(m => m.InventoryMgmt) },
      { path: 'table-map', loadComponent: () => import('./modules/admin/table-map/table-map').then(m => m.TableMap) },
      { path: 'staff-mgmt', loadComponent: () => import('./modules/admin/staff-mgmt/staff-mgmt').then(m => m.StaffMgmt) },
      { path: 'reservations', loadComponent: () => import('./modules/admin/reservations/reservations').then(m => m.Reservations) },
      { path: 'orders', loadComponent: () => import('./modules/admin/orders/orders').then(m => m.Orders) },
      { path: 'kitchen', loadComponent: () => import('./modules/admin/kitchen/kitchen').then(m => m.Kitchen) },
      { path: 'payments', loadComponent: () => import('./modules/admin/payments/payments').then(m => m.Payments) },
      { path: 'settings', loadComponent: () => import('./modules/admin/settings/settings').then(m => m.Settings) },
    ]
  },

  // 6. RUTA MESERO
  {
    path: 'mesero',
    canActivate: [roleGuard],
    data: { role: 'WAITER' },
    children: [
      { path: 'dashboard', loadComponent: () => import('./modules/waiter/dashboard/dashboard').then(m => m.WaiterDashboard) },
      { path: 'mapa', loadComponent: () => import('./modules/waiter/table-map/table-map').then(m => m.TableMap) },
      { path: 'pedido', loadComponent: () => import('./modules/waiter/order-entry/order-entry').then(m => m.OrderEntry) },
      { path: 'ordenes', loadComponent: () => import('./modules/waiter/active-orders/active-orders').then(m => m.ActiveOrders) },
      { path: 'cobro', loadComponent: () => import('./modules/waiter/billing/billing').then(m => m.Billing) }
    ]
  },

  // 7. RUTA COCINA
  {
    path: 'kitchen',
    canActivate: [roleGuard],
    data: { role: 'KITCHEN' },
    children: [
      { path: 'orders', loadComponent: () => import('./modules/kitchen/order-monitor/order-monitor').then(m => m.OrderMonitor) },
      { path: 'stock', loadComponent: () => import('./modules/kitchen/stock-control/stock-control').then(m => m.StockControl) }
    ]
  },

  // 8. COMODÍN FINAL (Evita el bucle de redirecciones)
  { 
    path: '**', 
    redirectTo: 'catalog' 
  }
];