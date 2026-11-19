import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-order-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-status.html',
  styleUrl: './order-status.scss'
})
export class OrderStatus implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private authSub?: Subscription;

  public items: any[] = [];
  public isLoading = true;
  
  private realtimeChannel: any; 
  private currentOrderId?: string;

  async ngOnInit() {
    this.authSub = this.auth.user$.subscribe(user => {
      if (user?.reservaId) {
        this.fetchDetalleOrden(user.reservaId);
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  public async fetchDetalleOrden(reservaId: string) {
    try {
      let orden: any = null;

      // 1. Buscar la orden activa más reciente vinculada directamente a la reservación
      const resReserva = await this.supabaseSvc.supabase
        .from('Orden')
        .select('id, estado')
        .eq('reservacionId', reservaId)
        .neq('estado', 'PAGADO')
        .order('fechaApertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resReserva.error) throw resReserva.error;
      orden = resReserva.data;

      // 2. Respaldo: si el mesero abrió la orden desde el mapa sin vincular reservacionId,
      // obtenemos la mesa asignada a esta reservación y buscamos la orden activa de esa mesa
      if (!orden) {
        const { data: reserva } = await this.supabaseSvc.supabase
          .from('Reservacion')
          .select('mesaId')
          .eq('id', reservaId)
          .maybeSingle();

        if (reserva?.mesaId) {
          const resMesa = await this.supabaseSvc.supabase
            .from('Orden')
            .select('id, estado')
            .eq('mesaId', reserva.mesaId)
            .neq('estado', 'PAGADO')
            .order('fechaApertura', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (resMesa.error) throw resMesa.error;
          orden = resMesa.data;
        }
      }

      if (orden) {
        this.currentOrderId = orden.id;

        const { data: detalles, error: detalleError } = await this.supabaseSvc.supabase
          .from('DetalleOrden')
          .select(`
            id,
            cantidad,
            estadoItem,
            notasCocina,
            menuItemId,
            MenuItem (
              nombre,
              imagenUrl
            )
          `)
          .eq('ordenId', orden.id);

        if (detalleError) throw detalleError;
        
        // Cada platillo mantiene su propio estado real (PENDIENTE, COCINANDO, LISTO o SERVIDO)
        this.items = detalles || [];

        this.setupOrderRealtime(orden.id, reservaId);
      } else {
        this.items = [];
      }
    } catch (err) {
      console.error('❌ Error cargando DetalleOrden:', err);
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  public getIcon(estado: string): string {
    const icons: Record<string, string> = {
      'PENDIENTE': 'schedule',
      'COCINANDO': 'soup_kitchen',
      'LISTO': 'room_service',
      'SERVIDO': 'check_circle'
    };
    return icons[estado] || 'schedule';
  }

  public getStatusLabel(estado: string): string {
    const labels: Record<string, string> = {
      'PENDIENTE': 'En espera',
      'COCINANDO': 'En preparación',
      'LISTO': '¡Listo en barra! 🛎️',
      'SERVIDO': 'Servido en mesa 🍽️'
    };
    return labels[estado] || 'En espera';
  }

  private setupOrderRealtime(ordenId: string, reservaId: string) {
    if (this.realtimeChannel) return;

    const uniqueChannelId = `client_status_chan_${ordenId.substring(0, 6)}_${Math.random().toString(36).substring(2, 6)}`;

    this.realtimeChannel = this.supabaseSvc.supabase
      .channel(uniqueChannelId)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'DetalleOrden',
        filter: `ordenId=eq.${ordenId}` 
      }, () => {
        this.fetchDetalleOrden(reservaId);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Orden',
        filter: `id=eq.${ordenId}`
      }, () => {
        this.fetchDetalleOrden(reservaId);
      })
      .subscribe();
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
    if (this.realtimeChannel) {
      this.supabaseSvc.supabase.removeChannel(this.realtimeChannel);
    }
  }
}