import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private authSub?: Subscription;

  public reserva: any = null;
  public isLoading = true;

  ngOnInit() {
    this.authSub = this.auth.user$.subscribe(user => {
      if (user?.reservaId) {
        this.fetchReserva(user.reservaId);
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    setTimeout(() => {
      if (this.isLoading) {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 6000); // Un segundo extra por latencia
  }

  // Helper para mensajes del Header
  getStatusMessage(estado: string): string {
    const messages: { [key: string]: string } = {
      'CONFIRMADA': 'Bienvenido al restaurante, disfruta tu estancia.',
      'PENDIENTE_CONFIRMAR': 'Por favor, confirma tu asistencia desde tu correo.',
      'WAITLIST': 'Estamos preparando un lugar especial para ti.',
      'CANCELADA': 'Esta reservación ya no es válida.'
    };
    return messages[estado] || 'Cargando detalles de tu visita...';
  }

  private async fetchReserva(id: string) {
    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('Reservacion')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      this.reserva = data;
    } catch (err) {
      console.error('❌ [Dashboard] Error:', err);
      this.reserva = null;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}