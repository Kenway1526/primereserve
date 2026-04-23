import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { Header } from '../../shared/components/header/header';
import { Auth } from '../../core/services/auth/auth';
import { APP_CONFIG } from '../../core/constants/config'; // 🚀 Importación de la constante

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, Sidebar, Header],
  template: `
    <div class="admin-wrapper">
      <app-sidebar [role]="'ADMIN'" [restaurantId]="restaurantId"></app-sidebar>

      <div class="main-content">
        <app-header [title]="'Administración Central'"></app-header>

        <main class="content-viewport">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private auth = inject(Auth);
  private platformId = inject(PLATFORM_ID);
  
  // 🚀 Sincronizamos con la constante global
  public restaurantId: string = APP_CONFIG.RESTAURANT_ID;

  ngOnInit() {
    // Ya no dependemos de suscripciones asíncronas para el ID del layout
    if (isPlatformBrowser(this.platformId)) {
      console.log(`[AdminLayout] Operando en: ${APP_CONFIG.RESTAURANT_NAME}`);
    }
  }
}