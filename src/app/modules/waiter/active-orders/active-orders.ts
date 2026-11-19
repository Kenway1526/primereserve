import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { Auth } from '../../../core/services/auth/auth';
import { APP_CONFIG } from '../../../core/constants/config';

@Component({
  selector: 'app-active-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-orders.html',
  styleUrl: './active-orders.css'
})
export class ActiveOrders implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService).supabase;
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  public activeOrders: any[] = [];
  public isLoading = true;
  private realtimeChannel: any;

  ngOnInit() {
    this.loadActiveOrders();
    this.setupRealtime();
  }

  async loadActiveOrders() {
    const user = this.auth.getUser();

    if (!user) {
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('Orden')
        .select(`
          id,
          estado,
          total,
          fechaApertura,
          mesaId, 
          Mesa (
            numeroMesa,
            zona
          ),
          DetalleOrden (
            id,
            cantidad,
            estadoItem,
            notasCocina,
            MenuItem (
              nombre
            )
          )
        `)
        .eq('usuarioId', user.id)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .neq('estado', 'PAGADO')
        .order('fechaApertura', { ascending: false });

      if (error) throw error;
      this.activeOrders = data || [];

    } catch (err) {
      console.error('❌ Error de Mapeo en pedidos del mesero:', err);
      this.activeOrders = [];
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  setupRealtime() {
    const user = this.auth.getUser();
    if (!user) return;

    const uniqueChannelId = `waiter_orders_rt_${Math.random().toString(36).substring(2, 9)}`;

    this.realtimeChannel = this.supabase
      .channel(uniqueChannelId)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'Orden',
        filter: `usuarioId=eq.${user.id}` 
      }, () => this.loadActiveOrders())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'DetalleOrden'
      }, () => this.loadActiveOrders())
      .subscribe(); 
  }

  /**
   * 🍽️ El mesero recoge la charola de barra y la entrega en mesa.
   * Ejecuta el mismo RPC que Cocina, actualiza Orden y DetalleOrden a SERVIDO
   * para que el cliente vea "Servido en mesa 🍽️" y se habilite el cobro en caja.
   */
  async markAsServed(orderId: string) {
    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      // 1. Pasamos los ítems que estaban en 'LISTO' a 'SERVIDO'
      const { error: detError } = await this.supabase
        .from('DetalleOrden')
        .update({ estadoItem: 'SERVIDO' })
        .eq('ordenId', orderId)
        .eq('estadoItem', 'LISTO');

      if (detError) throw detError;

      // 2. Verificamos si aún quedan ítems de otra ronda en cocina
      const { data: restantes } = await this.supabase
        .from('DetalleOrden')
        .select('id, estadoItem')
        .eq('ordenId', orderId);

      const quedanEnCocina = (restantes || []).some(
        p => !p.estadoItem || p.estadoItem === 'PENDIENTE' || p.estadoItem === 'COCINANDO'
      );

      // 3. Actualizamos Orden: 'EN_PREPARACION' si sigue cocinando algo, 'SERVIDO' si ya todo llegó a la mesa
      const { error: orderError } = await this.supabase
        .from('Orden')
        .update({ estado: quedanEnCocina ? 'EN_PREPARACION' : 'SERVIDO' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      await this.loadActiveOrders();

    } catch (err: any) {
      console.error('❌ Error al cambiar el estado a SERVIDO:', err);
      alert('No se pudo actualizar el pedido: ' + (err?.message || 'Error inesperado'));
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }
}