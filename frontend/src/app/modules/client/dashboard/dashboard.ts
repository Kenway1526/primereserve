import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  private router = inject(Router);
  private auth = inject(Auth);
  private supabaseSvc = inject(SupabaseService);

  public restaurantName = 'PRIME RESERVE';
  public reservation: any = null;
  public isLoading = true;
  private cdr = inject(ChangeDetectorRef);

  async ngOnInit() {
    const reservaId = localStorage.getItem('client_reserva_id');
    
    if (!reservaId) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.isLoading = true;
    try {
      // LLAMADA AL SERVICIO (que ya tiene el fix del alias)
      const { data, error } = await this.supabaseSvc.getReservaPorId(reservaId);

      if (error) {
        console.error('%c [Dashboard] Error de Supabase:', 'color: #ff4d4d', error);
        throw error;
      }

      this.reservation = data;
      console.log('%c [Dashboard] Reserva cargada con éxito:', 'color: #28a745', this.reservation);

    } catch (err) {
      console.error('Error al cargar reserva en Dashboard:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  logout() {
    this.auth.logout();
    localStorage.removeItem('client_reserva_id');
    localStorage.setItem('client_folio', '');
    this.router.navigate(['/auth/login']);
  }
}