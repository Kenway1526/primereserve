import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar implements OnInit {
  // 🚀 Inputs para recibir datos del Layout Padre (AdminComponent / KitchenComponent)
  @Input() role: string = '';
  @Input() restaurantId: string | null = null;

  public menuItems: any[] = [];

  ngOnInit() {
    this.generateMenu();
  }

  // Si el rol cambia dinámicamente, esto regenera el menú
  ngOnChanges() {
    this.generateMenu();
  }

  generateMenu() {
    const currentRole = this.role?.toUpperCase();

    if (currentRole === 'ADMIN') {
      this.menuItems = [
        { path: '/admin/dashboard', icon: 'dashboard', label: 'Estadistica' },
        { path: '/admin/reservations', icon: 'event_available', label: 'Reservaciones' },
        { path: '/admin/table-map', icon: 'layers', label: 'Mapa de Mesas' },
        { path: '/admin/orders', icon: 'receipt_long', label: 'Órdenes' },
        { path: '/admin/kitchen', icon: 'restaurant', label: 'Cocina' },
        { path: '/admin/payments', icon: 'account_balance_wallet', label: 'Pagos y Ventas' },
        { path: '/admin/inventory-mgmt', icon: 'inventory_2', label: 'Inventario' },
        { path: '/admin/staff-mgmt', icon: 'badge', label: 'Personal' },
        { path: '/admin/settings', icon: 'settings', label: 'Configuración', isBottom: true } // 👈 Marcado para el fondo
      ];
    } else if (currentRole === 'KITCHEN' || currentRole === 'COCINA') {
      this.menuItems = [
        { path: '/kitchen/order-monitor', icon: 'monitor', label: 'Monitor' },
        { path: '/kitchen/stock-control', icon: 'inventory_2', label: 'Stock' },
        { path: '/kitchen/menu', icon: 'restaurant_menu', label: 'Menú Digital' }
      ];
    } else if (currentRole === 'WAITER' || currentRole === 'MESERO') {
      this.menuItems = [
        { path: '/waiter/table-map', icon: 'layers', label: 'Mesas' },
        { path: '/waiter/order-entry', icon: 'add_shopping_cart', label: 'Nueva orden' },
        { path: '/waiter/active-orders', icon: 'receipt_long', label: 'Pedidos' }, // 👈 Corregido: receipt_long
        { path: '/waiter/billing', icon: 'payments', label: 'Cuenta' }            // 👈 Corregido: payments (más acorde a 'bill')
      ];
    }
  }
}