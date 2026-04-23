import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { Header } from '../../shared/components/header/header';
import { APP_CONFIG } from '../../core/constants/config';

@Component({
  selector: 'app-kitchen-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar, Header],
  template: `
    <div class="admin-wrapper"> <app-sidebar [role]="'KITCHEN'" [restaurantId]="resId"></app-sidebar>
      <div class="main-content">
        <app-header [title]="'Operaciones de Cocina'"></app-header>
        <main class="content-viewport">
          <router-outlet></router-outlet> </main>
      </div>
    </div>
  `,
  styleUrl: '../admin/admin.component.scss' // 👈 Reutiliza el CSS de admin directamente
})
export class KitchenComponent {
  public resId = APP_CONFIG.RESTAURANT_ID;
}