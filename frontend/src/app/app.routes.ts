import { Routes } from '@angular/router';
import { roleGuard } from './core/guards/role/role-guard';
import { AdminComponent } from './modules/admin/admin.component';

// Importa aquí tus componentes principales (Home, Dashboards, etc.)

export const routes: Routes = [
  { path: '', redirectTo: 'home/login', pathMatch: 'full' },
  
  {
    path: 'home',
    children: [
      { 
        path: 'login', 
        loadComponent: () => import('./modules/home/login/login').then(m => m.Login) 
      },
      { 
        path: 'register', 
        loadComponent: () => import('./modules/home/register/register').then(m => m.Register) 
      },
      { 
        path: 'catalog', 
        loadComponent: () => import('./modules/home/restaurant-catalog/restaurant-catalog').then(m => m.RestaurantCatalog) 
      }
    ]
  },

  {
    path: 'client',
    canActivate: [roleGuard],
    data: { role: 'CLIENT' },
    children: [
      { 
        path: 'dashboard', 
        loadComponent: () => import('./modules/client/dashboard/dashboard').then(m => m.Dashboard) 
      },
      { 
        path: 'reserve', 
        loadComponent: () => import('./modules/client/reservation-stepper/reservation-stepper').then(m => m.ReservationStepper) 
      },
      { 
        path: 'menu', 
        loadComponent: () => import('./modules/client/menu-view/menu-view').then(m => m.MenuView) 
      }
    ]
  },

  {
    path: 'admin',
    component: AdminComponent,
    canActivate: [roleGuard],
    data: { role: 'ADMIN' },
    children: [
      { 
        path: 'dashboard', 
        loadComponent: () => import('./modules/admin/dashboard/dashboard').then(m => m.Dashboard) 
      },
      { 
        path: 'inventory-mgmt', 
        loadComponent: () => import('./modules/admin/inventory-mgmt/inventory-mgmt').then(m => m.InventoryMgmt) 
      },
      { 
        path: 'table-map', 
        loadComponent: () => import('./modules/admin/table-map/table-map').then(m => m.TableMap) 
      },
      { 
        path: 'staff-mgmt', 
        loadComponent: () => import('./modules/admin/staff-mgmt/staff-mgmt').then(m => m.StaffMgmt) 
      },
      { 
        path: 'reservations', 
        loadComponent: () => import('./modules/admin/reservations/reservations').then(m => m.Reservations) 
      },
      { 
        path: 'orders', 
        loadComponent: () => import('./modules/admin/orders/orders').then(m => m.Orders) 
      },
      { 
        path: 'kitchen', 
        loadComponent: () => import('./modules/admin/kitchen/kitchen').then(m => m.Kitchen) 
      },
      { 
        path: 'payments', 
        loadComponent: () => import('./modules/admin/payments/payments').then(m => m.Payments) 
      },
      { 
        path: 'settings', 
        loadComponent: () => import('./modules/admin/settings/settings').then(m => m.Settings) 
      },
    ]
  },

  {
    path: 'waiter',
    canActivate: [roleGuard],
    data: { role: 'WAITER' },
    children: [
      { 
        path: 'tables', 
        loadComponent: () => import('./modules/waiter/table-map/table-map').then(m => m.TableMap) 
      },
      { 
        path: 'order', 
        loadComponent: () => import('./modules/waiter/order-entry/order-entry').then(m => m.OrderEntry) 
      },
      { 
        path: 'billing', 
        loadComponent: () => import('./modules/waiter/billing/billing').then(m => m.Billing) 
      }
    ]
  },

  {
    path: 'kitchen',
    canActivate: [roleGuard],
    data: { role: 'KITCHEN' },
    children: [
      { 
        path: 'orders', 
        loadComponent: () => import('./modules/kitchen/order-monitor/order-monitor').then(m => m.OrderMonitor) 
      },
      { 
        path: 'stock', 
        loadComponent: () => import('./modules/kitchen/stock-control/stock-control').then(m => m.StockControl) 
      }
    ]
  },

  { path: '', redirectTo: 'admin/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'home/login' }
];