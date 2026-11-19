import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase';
import { Subscription } from 'rxjs';
import { RouterLink, RouterModule } from '@angular/router'; 

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterModule], 
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
  }

  private async fetchReserva(id: string) {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('Reservacion')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      this.reserva = data;

      this.initRealtimeSubscription(id);

    } catch (err) {
      console.error('Error al obtener reserva de Supabase:', err);
      this.reserva = null;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private initRealtimeSubscription(reservaId: string) {
    this.supabaseSvc.supabase
      .channel(`reserva_status_${reservaId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'Reservacion', filter: `id=eq.${reservaId}` }, 
        (payload) => {
          this.reserva = payload.new;
          this.cdr.detectChanges();
        }
      )
      .subscribe();
  }

  getStatusMessage(estado: string): string {
    const messages: { [key: string]: string } = {
      'SENTADO': 'Ya estás en tu mesa. ¡Esperamos que disfrutes tu comida!',
      'CONFIRMADA': 'Tu mesa está lista y te estamos esperando.',
      'PENDIENTE_CONFIRMAR': 'Por favor, asegúrate de haber confirmado desde tu correo.',
      'WAITLIST': 'Estamos trabajando para asignarte una mesa lo antes posible.',
      'CANCELADA': 'Esta reservación ha sido cancelada.'
    };
    return messages[estado] || 'Cargando detalles de tu visita...';
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    this.supabaseSvc.supabase.removeAllChannels();
  }
}