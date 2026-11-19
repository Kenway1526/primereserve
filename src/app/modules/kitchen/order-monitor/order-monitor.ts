import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
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
export class OrderMonitor implements OnInit, OnDestroy {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public itemsPendientes: any[] = [];
  public itemsCocinando: any[] = [];
  public itemsListos: any[] = [];
  public isLoading = true;
  private kitchenChannel: any;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.fetchKitchenItems();
      this.initKitchenRealtime();
    }
  }

  async fetchKitchenItems() {
    try {
      const { data: mapaMesas, error: mesasError } = await this.supabaseSvc.supabase
        .from('Mesa')
        .select('id, numeroMesa')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID);

      if (mesasError) throw mesasError;
      const listaMesas = mapaMesas || [];

      const { data: ordenesActivas, error: ordenError } = await this.supabaseSvc.supabase
        .from('Orden')
        .select('id, mesaId, estado')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .neq('estado', 'PAGADO'); 

      if (ordenError) throw ordenError;

      if (!ordenesActivas || ordenesActivas.length === 0) {
        this.itemsPendientes = [];
        this.itemsCocinando = [];
        this.itemsListos = [];
        return;
      }

      const listaIdsOrdenes = ordenesActivas.map(o => o.id);

      const { data: platillosRaw, error: platillosError } = await this.supabaseSvc.supabase
        .from('DetalleOrden')
        .select('*')
        .in('ordenId', listaIdsOrdenes);

      if (platillosError) throw platillosError;

      const { data: catalogoMenu, error: menuError } = await this.supabaseSvc.supabase
        .from('MenuItem')
        .select('id, nombre')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID);

      if (menuError) throw menuError;
      const itemsCatalogo = catalogoMenu || [];

      const allItemsMapped = (platillosRaw || []).map(item => {
        const ordenMadre = ordenesActivas.find(o => o.id === item.ordenId);
        const datosPlatillo = itemsCatalogo.find(m => m.id === item.menuItemId);
        const mesaFisica = ordenMadre ? listaMesas.find(m => m.id === ordenMadre.mesaId) : null;

        return {
          ...item,
          MenuItem: datosPlatillo ? { nombre: datosPlatillo.nombre } : { nombre: 'Platillo Indefinido' },
          Orden: mesaFisica ? { numeroMesa: mesaFisica.numeroMesa } : { numeroMesa: '??' }
        };
      });

      this.itemsPendientes = allItemsMapped.filter(i => i.estadoItem === 'PENDIENTE' || !i.estadoItem);
      this.itemsCocinando = allItemsMapped.filter(i => i.estadoItem === 'COCINANDO');
      this.itemsListos = allItemsMapped.filter(i => i.estadoItem === 'LISTO');

    } catch (err) {
      console.error('❌ Error en el cargador de cocina:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private initKitchenRealtime() {
    const uniqueId = `kitchen_realtime_${Math.random().toString(36).substring(2, 9)}`;
    
    this.kitchenChannel = this.supabaseSvc.supabase
      .channel(uniqueId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'DetalleOrden' }, () => this.fetchKitchenItems())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Orden' }, () => this.fetchKitchenItems())
      .subscribe();
  }

  /**
   * 🔄 CONTROLADOR DE ESTADOS DEL TABLERO KANBAN
   */
  async avanzarEstado(item: any) {
    let siguienteEstado = 'COCINANDO';
    
    if (item.estadoItem === 'COCINANDO') {
      siguienteEstado = 'LISTO';
    }

    try {
      // ESCENARIO A: El platillo avanza en producción (PENDIENTE -> COCINANDO -> LISTO)
      if (item.estadoItem === 'PENDIENTE' || item.estadoItem === 'COCINANDO' || !item.estadoItem) {
        const { error: itemError } = await this.supabaseSvc.supabase
          .from('DetalleOrden')
          .update({ estadoItem: siguienteEstado })
          .eq('id', item.id);

        if (itemError) throw itemError;

        // Revisamos el estado global de todos los platillos de la orden
        const { data: hermanos } = await this.supabaseSvc.supabase
          .from('DetalleOrden')
          .select('id, estadoItem')
          .eq('ordenId', item.ordenId);

        const lista = (hermanos || []).map(p =>
          p.id === item.id ? { ...p, estadoItem: siguienteEstado } : p
        );

        const hayEnProduccion = lista.some(p => !p.estadoItem || p.estadoItem === 'PENDIENTE' || p.estadoItem === 'COCINANDO');
        const todosListosOServidos = lista.every(p => p.estadoItem === 'LISTO' || p.estadoItem === 'SERVIDO');
        const algunoEnBarra = lista.some(p => p.estadoItem === 'LISTO');

        if (hayEnProduccion) {
          await this.supabaseSvc.supabase
            .from('Orden')
            .update({ estado: 'EN_PREPARACION' })
            .eq('id', item.ordenId);
        } else if (todosListosOServidos && algunoEnBarra) {
          await this.supabaseSvc.supabase
            .from('Orden')
            .update({ estado: 'LISTO' })
            .eq('id', item.ordenId);
        }

        await this.fetchKitchenItems();
      } 
      // ESCENARIO B: BOTÓN DESPACHAR (Listo en barra -> Servido en mesa)
      else if (item.estadoItem === 'LISTO') {
        this.isLoading = true;
        this.cdr.detectChanges();

        // Marcamos todos los platillos que estaban en 'LISTO' de esa orden como 'SERVIDO'
        const { error: detError } = await this.supabaseSvc.supabase
          .from('DetalleOrden')
          .update({ estadoItem: 'SERVIDO' })
          .eq('ordenId', item.ordenId)
          .eq('estadoItem', 'LISTO');

        if (detError) throw detError;

        // Verificamos si quedan platillos pendientes/cocinando de otra ronda en la misma orden
        const { data: restantes } = await this.supabaseSvc.supabase
          .from('DetalleOrden')
          .select('id, estadoItem')
          .eq('ordenId', item.ordenId);

        const quedanEnCocina = (restantes || []).some(
          p => !p.estadoItem || p.estadoItem === 'PENDIENTE' || p.estadoItem === 'COCINANDO'
        );

        await this.supabaseSvc.supabase
          .from('Orden')
          .update({ estado: quedanEnCocina ? 'EN_PREPARACION' : 'SERVIDO' })
          .eq('id', item.ordenId);

        await this.fetchKitchenItems();
      }

    } catch (err: any) {
      console.error('❌ Error operando estados del Kanban:', err);
      alert('No se pudo actualizar el estado: ' + (err?.message || 'Error inesperado'));
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    if (this.kitchenChannel) {
      this.supabaseSvc.supabase.removeChannel(this.kitchenChannel);
    }
  }
}