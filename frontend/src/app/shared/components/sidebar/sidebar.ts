import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  // Opciones de navegación para el Admin
  public menuItems = [
    { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
    { path: '/admin/inventory-mgmt', icon: 'inventory', label: 'Inventario' },
    { path: '/admin/table-map', icon: 'layers', label: 'Mapa de Mesas' },
    { path: '/admin/staff-mgmt', icon: 'badge', label: 'Personal' }
  ];
}