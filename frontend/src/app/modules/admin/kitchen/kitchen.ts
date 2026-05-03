import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 🚀 La fuente de la verdad

@Component({
  selector: 'app-kitchen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kitchen.html',
  styleUrl: './kitchen.css'
})
export class Kitchen implements OnInit, OnDestroy {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public orders: any[] = [];
  public isLoading = true;
  private subscription: any;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // 🚀 Cargamos directamente usando la constante estática
      await this.loadOrders();
      this.setupRealtime();
    }
  }

  async loadOrders() {
    try {
      this.isLoading = true;
      const { data, error } = await this.supabaseSvc.supabase
        .from('Orden')
        .select(`
          *,
          Mesa ( numeroMesa ),
          DetalleOrden (
            *,
            MenuItem ( nombre )
          )
        `)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // 👈 Sincronizado
        .in('estado', ['ABIERTA', 'EN_PREPARACION', 'LISTO']) 
        .order('fechaApertura', { ascending: true });

      if (error) throw error;
      this.orders = data || [];
    } catch (err) {
      console.error('Error en carga de cocina:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  setupRealtime() {
    // 🛡️ El filtro del canal ahora es ultra-seguro con el ID constante
    this.subscription = this.supabaseSvc.supabase
      .channel('kitchen_realtime')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'Orden', 
          filter: `restauranteId=eq.${APP_CONFIG.RESTAURANT_ID}` // 👈 Sincronización Realtime
        }, 
        () => {
          console.log('🔔 Nueva actualización de orden recibida');
          this.loadOrders();
        }
      )
      .subscribe();
  }

  async updateStatus(orderId: string, nextStatus: string) {
    try {
      const { error } = await this.supabaseSvc.supabase
        .from('Orden')
        .update({ estado: nextStatus })
        .eq('id', orderId)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID); // 👈 Seguridad extra

      if (error) throw error;
      
      // Actualización optimista local para que la UI se sienta rápida
      const order = this.orders.find(o => o.id === orderId);
      if (order) order.estado = nextStatus;
      
    } catch (err) {
      console.error('Error al actualizar estado en cocina:', err);
    } finally {
      this.cdr.detectChanges();
    }
  }

  // Getters para las columnas de la cocina
  get pending() { return this.orders.filter(o => o.estado === 'ABIERTA'); }
  get cooking() { return this.orders.filter(o => o.estado === 'EN_PREPARACION'); }
  get ready() { return this.orders.filter(o => o.estado === 'LISTO'); }

  ngOnDestroy() {
    if (this.subscription) {
      this.supabaseSvc.supabase.removeChannel(this.subscription);
    }
  }
}