import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { Header } from '../../shared/components/header/header';
import { APP_CONFIG } from '../../core/constants/config';

@Component({
  selector: 'app-waiter-layout', // 👈 Selector único para evitar conflictos
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar, Header],
  template: `
    <div class="admin-wrapper"> 
      <app-sidebar [role]="'WAITER'" [restaurantId]="resId"></app-sidebar>
      
      <div class="main-content">
        <app-header [title]="'Gestión de Sala y Pedidos'"></app-header>
        
        <main class="content-viewport">
          <router-outlet></router-outlet> 
        </main>
      </div>
    </div>
  `,
  styleUrl: './waiter.component.scss' // 👈 Seguimos reutilizando el CSS para consistencia visual
})
export class WaiterComponent {
  public resId = APP_CONFIG.RESTAURANT_ID;
}