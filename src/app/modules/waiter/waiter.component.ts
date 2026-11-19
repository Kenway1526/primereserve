import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../../shared/components/sidebar/sidebar';
import { Header } from '../../shared/components/header/header';
import { APP_CONFIG } from '../../core/constants/config';
import { SupabaseService } from '../../core/services/supabase'; // Asegura la ruta correcta

@Component({
  selector: 'app-waiter-layout',
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
  styleUrl: './waiter.component.scss'
})
export class WaiterComponent implements OnInit, OnDestroy {
  public resId = APP_CONFIG.RESTAURANT_ID;
  
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private channel: any;

  ngOnInit() {
    this.initNotificationListener();
  }

  async initNotificationListener() {
    // 1. Obtenemos el ID del mesero actual
    const { data: { user } } = await this.supabaseSvc.supabase.auth.getUser();
    if (!user) return;

    // 2. Escuchamos solo notificaciones que coincidan con este mesero
    // Para esto, la tabla 'Notificaciones' debe incluir también el meseroId 
    // o el mesero debe estar suscrito a un canal basado en su ID.
    
    this.channel = this.supabaseSvc.supabase
      .channel(`mesero-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notificaciones',
          // Filtro opcional: si quieres que la tabla notificaciones 
          // ya venga etiquetada con el meseroId
          filter: `meseroId=eq.${user.id}` 
        },
        (payload) => {
          this.showAlert(payload.new);
        }
      )
      .subscribe();
  }

  private showAlert(notificacion: any) {
    // 1. Efecto de sonido (opcional, requiere que el usuario haya hecho un click previo en la app)
    const audio = new Audio('assets/sounds/bell.mp3');
    audio.play().catch(() => console.log('Sonido bloqueado por el navegador'));

    // 2. Alerta visual
    // Si tienes un servicio de Toasts, úsalo aquí. Si no, un alert para probar:
    alert(`🛎️ LLAMADO EN MESA: ${notificacion.folioReserva}\nSolicitan asistencia de mesero.`);
    
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    // Muy importante cerrar el canal para no saturar la conexión de Supabase
    if (this.channel) {
      this.supabaseSvc.supabase.removeChannel(this.channel);
    }
  }
}