import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WaiterService, EstadoMesa } from '../../../core/services/waiter/waiter';
import { SupabaseService } from '../../../core/services/supabase';
import { Auth } from '../../../core/services/auth/auth';
import { APP_CONFIG } from '../../../core/constants/config'; 

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-entry.html',
  styleUrl: './order-entry.scss' 
})
export class OrderEntry implements OnInit {
  private waiterSvc = inject(WaiterService);
  private supabase = inject(SupabaseService).supabase;
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  public selectedTable: any;
  public categories: string[] = ['ENTRADAS', 'PLATOS_FUERTES', 'BEBIDAS', 'POSTRES'];
  public activeCategory: string = 'ENTRADAS';
  
  public menuItems: any[] = [];
  public filteredItems: any[] = [];
  public cart: any[] = [];
  public total: number = 0;
  public isLoading = true;
  public isSending = false;

  async ngOnInit() {
    this.selectedTable = this.waiterSvc.getSelectedTable();
    
    if (!this.selectedTable) {
      this.router.navigate(['/waiter/table-map']);
      return;
    }
    await this.loadMenu();
  }

  /**
   * Calcula cuántas porciones máximas pueden prepararse de un platillo según su Receta e Ingrediente.stockActual
   */
  private calcularPorcionesDisponibles(platillo: any): number {
    const receta = platillo.Receta || [];
    if (receta.length === 0) {
      return platillo.estaDisponible === false ? 0 : 999;
    }

    let maxPorciones = Infinity;
    for (const r of receta) {
      const stock = Number(r.Ingrediente?.stockActual ?? 0);
      const requerido = Number(r.cantidadUsada ?? 0);
      if (requerido <= 0) continue;

      const posibles = Math.floor(stock / requerido);
      if (posibles < maxPorciones) {
        maxPorciones = posibles;
      }
    }
    return maxPorciones === Infinity ? 999 : Math.max(0, maxPorciones);
  }

  async loadMenu() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const { data: menuData, error: menuErr } = await this.supabase
        .from('MenuItem')
        .select(`
          *,
          Receta (
            cantidadUsada,
            ingredienteId,
            Ingrediente (id, nombre, stockActual)
          )
        `)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .eq('estaDisponible', true);
      
      if (menuErr) throw menuErr;

      // Filtramos solo platillos cuya receta tenga stock suficiente para al menos 1 porción
      const itemsConStock = (menuData || [])
        .map(platillo => ({
          ...platillo,
          maxPorciones: this.calcularPorcionesDisponibles(platillo)
        }))
        .filter(platillo => platillo.maxPorciones >= 1);

      this.menuItems = itemsConStock;
      this.filterByCategory(this.activeCategory);

    } catch (error) {
      console.error('❌ Error calculando disponibilidad de stock:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  filterByCategory(cat: string) {
    this.activeCategory = cat;
    this.filteredItems = this.menuItems.filter(
      item => (item.categoria || '').toUpperCase().replace(/\s+/g, '_') === cat || item.categoria === cat
    );
  }

  obtenerCantidadItem(menuItemId: string): number {
    const existing = this.cart.find(c => c.menuItemId === menuItemId);
    return existing ? existing.cantidad : 0;
  }

  addToCart(item: any) {
    const maxDisponibles = item.maxPorciones ?? this.calcularPorcionesDisponibles(item);
    const existing = this.cart.find(c => c.menuItemId === item.id);
    const cantidadActual = existing ? existing.cantidad : 0;

    if (cantidadActual + 1 > maxDisponibles) {
      alert(`Stock insuficiente para agregar más porciones de "${item.nombre}". Máximo disponible: ${maxDisponibles}.`);
      return;
    }

    if (existing) {
      existing.cantidad += 1;
      existing.subtotal = existing.cantidad * item.precio;
    } else {
      this.cart.push({ 
        menuItemId: item.id, 
        nombre: item.nombre, 
        precioHistorico: item.precio, 
        cantidad: 1,
        subtotal: item.precio,
        notasCocina: '',
        receta: item.Receta || []
      });
    }
    this.calculateTotal();
  }

  restarDelCart(itemId: string) {
    const index = this.cart.findIndex(c => c.menuItemId === itemId);
    if (index !== -1) {
      this.updateQuantity(index, -1);
    }
  }

  updateQuantity(index: number, delta: number) {
    const item = this.cart[index];
    if (delta > 0) {
      const menuObj = this.menuItems.find(m => m.id === item.menuItemId);
      const maxDisponibles = menuObj ? menuObj.maxPorciones : 999;
      if (item.cantidad + delta > maxDisponibles) {
        alert(`Stock insuficiente para "${item.nombre}". Máximo disponible: ${maxDisponibles}.`);
        return;
      }
    }

    item.cantidad += delta;
    item.subtotal = item.cantidad * item.precioHistorico;
    
    if (item.cantidad <= 0) {
      this.cart.splice(index, 1);
    }
    this.calculateTotal();
  }

  calculateTotal() {
    this.total = this.cart.reduce((acc, item) => acc + item.subtotal, 0);
  }

  async sendToKitchen() {
    const user = this.auth.getUser();
    if (this.cart.length === 0 || this.isSending || !user) return;

    this.isSending = true;
    this.cdr.detectChanges();

    try {
      // 1. Verificar stock fresco en base de datos antes de confirmar el pedido
      const { data: ingredientesDB, error: ingErr } = await this.supabase
        .from('Ingrediente')
        .select('id, nombre, stockActual')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID);

      if (ingErr) throw ingErr;

      const stockMap = new Map<string, { id: string; nombre: string; stockActual: number }>();
      (ingredientesDB || []).forEach(ing => {
        stockMap.set(ing.id, { ...ing, stockActual: Number(ing.stockActual) });
      });

      // Calculamos el consumo acumulado por ingrediente de todo el carrito
      const consumoPorIngrediente = new Map<string, number>();

      for (const itemCarrito of this.cart) {
        const receta = itemCarrito.receta || [];
        if (receta.length > 0) {
          for (const r of receta) {
            const ingId = r.ingredienteId || r.Ingrediente?.id;
            if (!ingId) continue;
            const totalRequerido = Number(r.cantidadUsada) * Number(itemCarrito.cantidad);
            consumoPorIngrediente.set(ingId, (consumoPorIngrediente.get(ingId) || 0) + totalRequerido);
          }
        } else {
          // Respaldo por nombre si un ítem aún no tiene receta vinculada
          const coincidencia = (ingredientesDB || []).find(
            ing => ing.nombre.toLowerCase().trim() === itemCarrito.nombre.toLowerCase().trim()
          );
          if (coincidencia) {
            consumoPorIngrediente.set(
              coincidencia.id,
              (consumoPorIngrediente.get(coincidencia.id) || 0) + Number(itemCarrito.cantidad)
            );
          }
        }
      }

      // Validamos que haya stock suficiente para todos los ingredientes requeridos
      for (const [ingId, requerido] of consumoPorIngrediente.entries()) {
        const ingActual = stockMap.get(ingId);
        if (ingActual && ingActual.stockActual < requerido) {
          alert(`Stock insuficiente de "${ingActual.nombre}". Disponible: ${ingActual.stockActual}, requerido: ${requerido}.`);
          this.isSending = false;
          await this.loadMenu();
          return;
        }
      }

      // 2. Buscar reservación activa y orden abierta de la mesa
      const { data: resActiva } = await this.supabase
        .from('Reservacion')
        .select('id')
        .eq('mesaId', this.selectedTable.id)
        .in('estado', ['SENTADO', 'CONFIRMADA'])
        .order('fechaPrincipal', { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: ordenExistente } = await this.supabase
        .from('Orden')
        .select('id, total, reservacionId')
        .eq('mesaId', this.selectedTable.id)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .neq('estado', 'PAGADO')
        .order('fechaApertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      let orderId: string;

      if (ordenExistente) {
        const nuevoTotal = Number(ordenExistente.total || 0) + this.total;
        const { data: updatedOrder, error: updErr } = await this.supabase
          .from('Orden')
          .update({
            estado: 'EN_PREPARACION',
            total: nuevoTotal,
            reservacionId: ordenExistente.reservacionId || (resActiva ? resActiva.id : null)
          })
          .eq('id', ordenExistente.id)
          .select()
          .single();

        if (updErr) throw updErr;
        orderId = updatedOrder.id;
      } else {
        const { data: newOrder, error: orderErr } = await this.supabase
          .from('Orden')
          .insert({
            mesaId: this.selectedTable.id,    
            usuarioId: user.id,              
            restauranteId: APP_CONFIG.RESTAURANT_ID,
            estado: 'EN_PREPARACION', 
            total: this.total,
            reservacionId: resActiva ? resActiva.id : null 
          })
          .select()
          .single();

        if (orderErr) throw orderErr;
        orderId = newOrder.id;
      }

      // 3. Insertar DetalleOrden
      const details = this.cart.map(item => ({
        ordenId: orderId,                 
        menuItemId: item.menuItemId,       
        cantidad: item.cantidad,           
        precioHistorico: item.precioHistorico, 
        subtotal: item.subtotal,           
        estadoItem: 'PENDIENTE',           
        notasCocina: item.notasCocina      
      }));

      const { error: detailErr } = await this.supabase
        .from('DetalleOrden')
        .insert(details);

      if (detailErr) throw detailErr;

      // 4. Descontar stock en Ingrediente (nunca menor a 0)
      for (const [ingId, requerido] of consumoPorIngrediente.entries()) {
        const ingActual = stockMap.get(ingId);
        if (ingActual) {
          const stockFinal = Math.max(0, Number((ingActual.stockActual - requerido).toFixed(4)));
          ingActual.stockActual = stockFinal;

          await this.supabase
            .from('Ingrediente')
            .update({ stockActual: stockFinal })
            .eq('id', ingId);
        }
      }

      // 5. Deshabilitar automáticamente cualquier platillo del menú cuyo stock ya no alcance para 1 porción
      const { data: todosLosPlatillos } = await this.supabase
        .from('MenuItem')
        .select(`
          id,
          estaDisponible,
          Receta (
            cantidadUsada,
            ingredienteId
          )
        `)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .eq('estaDisponible', true);

      for (const platillo of todosLosPlatillos || []) {
        const receta = platillo.Receta || [];
        if (receta.length === 0) continue;

        const sinStockSuficiente = receta.some((r: any) => {
          const ing = stockMap.get(r.ingredienteId);
          if (!ing) return false;
          return ing.stockActual <= 0 || ing.stockActual < Number(r.cantidadUsada);
        });

        if (sinStockSuficiente) {
          await this.supabase
            .from('MenuItem')
            .update({ estaDisponible: false })
            .eq('id', platillo.id);
        }
      }

      await this.waiterSvc.updateTableStatus(this.selectedTable.id, EstadoMesa.OCUPADA);
      this.cart = [];
      this.router.navigate(['/waiter/table-map']);
      
    } catch (error) {
      console.error('Error enviando a cocina:', error);
      alert('Error al procesar el pedido');
    } finally {
      this.isSending = false;
      this.cdr.detectChanges();
    }
  }

  public onImageError(event: any) {
    if (!event.target.dataset['fallbackApplied']) {
      event.target.dataset['fallbackApplied'] = 'true';
      event.target.src = 'assets/default-food.png';
    } else {
      event.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"><rect width="200" height="120" fill="%23151515"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-family="sans-serif" font-size="12">SIN IMAGEN</text></svg>';
    }
  }
}