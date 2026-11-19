import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-monitor.html',
  styleUrl: './order-monitor.scss'
})
export class OrderMonitor implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public itemsPendientes: any[] = [];
  public itemsCocinando: any[] = [];
  public itemsListos: any[] = [];
  public isLoading = true;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.fetchKitchenItems();
      this.initKitchenRealtime();
    }
  }

  async fetchKitchenItems() {
    try {
      // 🚀 CONSULTA MAESTRA CON JOIN: Traemos detalle, el nombre desde MenuItem y el local desde Orden
      const { data, error } = await this.supabaseSvc.supabase
        .from('DetalleOrden')
        .select(`
          id,
          ordenId,
          menuItemId,
          cantidad,
          notasCocina,
          estadoItem,
          MenuItem ( nombre ),
          Orden!inner (
            restauranteId,
            mesaId,
            estado
          )
        `)
        .eq('Orden.restauranteId', APP_CONFIG.RESTAURANT_ID)
        .neq('Orden.estado', 'PAGADO') // Descartamos comandas ya cobradas
        .neq('estadoItem', 'ENTREGADO'); // Descartamos lo que ya se sirvió

      if (error) throw error;

      const allItems = data || [];

      // Clasificación en las tres colas de producción (homologando '---' y nulos a PENDIENTE)
      this.itemsPendientes = allItems.filter(i => i.estadoItem === 'PENDIENTE' || i.estadoItem === '---' || !i.estadoItem);
      this.itemsCocinando = allItems.filter(i => i.estadoItem === 'COCINANDO');
      this.itemsListos = allItems.filter(i => i.estadoItem === 'LISTO');

    } catch (err) {
      console.error('❌ Error en Kanban de Cocina:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private initKitchenRealtime() {
    this.supabaseSvc.supabase
      .channel('kitchen_kanban_global')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'DetalleOrden' }, () => {
        this.fetchKitchenItems();
      })
      .subscribe();
  }

  async avanzarEstado(item: any) {
    let siguienteEstado = 'COCINANDO';
    if (item.estadoItem === 'COCINANDO') siguienteEstado = 'LISTO';
    else if (item.estadoItem === 'LISTO') siguienteEstado = 'ENTREGADO';

    try {
      const { error } = await this.supabaseSvc.supabase
        .from('DetalleOrden')
        .update({ estadoItem: siguienteEstado })
        .eq('id', item.id);

      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  }
}