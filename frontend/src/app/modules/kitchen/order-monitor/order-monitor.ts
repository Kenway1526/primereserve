import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 🚀 Importación de la constante

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

  public activeOrders: any[] = [];
  public totalVentasActivas: number = 0;
  public isLoading = true;

  // 🚀 Sincronizamos con el ID estático
  private restaurantId: string = APP_CONFIG.RESTAURANT_ID;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Cargamos directamente ya que el ID es constante
      await this.loadOrders();
    }
  }

  async loadOrders() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      // 1. Consulta filtrada por el ID estático
      const { data, error } = await this.supabaseSvc.supabase
        .from('Orden')
        .select(`
          *,
          Mesa ( numeroMesa ), 
          DetalleOrden (
            cantidad,
            precioHistorico
          )
        `)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // 👈 Sincronizado
        .neq('estado', 'PAGADO') // Solo lo que está en curso
        .order('fechaApertura', { ascending: false });

      if (error) throw error;

      // 2. Mapeo y cálculo de totales
      this.activeOrders = (data || []).map(order => {
        // Verificamos que DetalleOrden exista para evitar errores
        const detalles = order.DetalleOrden || [];
        const total = detalles.reduce((acc: number, item: any) => {
          return acc + (Number(item.precioHistorico || 0) * Number(item.cantidad || 0));
        }, 0);
        
        return { ...order, totalCalculado: total };
      });

      // 3. Sumatoria global de lo que hay en el salón
      this.totalVentasActivas = this.activeOrders.reduce((acc, o) => acc + o.totalCalculado, 0);

      console.log(`✅ ${this.activeOrders.length} órdenes activas en ${APP_CONFIG.RESTAURANT_NAME}`);

    } catch (err) {
      console.error('Error en carga de órdenes:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  gestionarOrden(orderId: string) {
    // Aquí puedes navegar a un detalle de orden o abrir un modal
    console.log('Gestionando orden:', orderId);
  }
}