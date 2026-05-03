import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { WaiterService } from '../../../core/services/waiter/waiter';
import { SupabaseService } from '../../../core/services/supabase';
import { Auth } from '../../../core/services/auth/auth';
import { APP_CONFIG } from '../../../core/constants/config'; // Asegúrate de tener tu ID de restaurante

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './order-entry.html',
  styleUrl: './order-entry.scss' // Cambiado a .css según tu preferencia anterior
})
export class OrderEntry implements OnInit {
  private waiterSvc = inject(WaiterService);
  private supabase = inject(SupabaseService).supabase;
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  public selectedTable: any;
  // Sincronizado con tus ENUMS: ENTRADAS, PLATOS_FUERTES, BEBIDAS, POSTRES
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

  async loadMenu() {
    this.isLoading = true;
    const { data, error } = await this.supabase
      .from('MenuItem')
      .select('*')
      .eq('restauranteId', APP_CONFIG.RESTAURANT_ID); // Filtramos por tu local res_001
    
    if (data) {
      this.menuItems = data;
      this.filterByCategory(this.activeCategory);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  filterByCategory(cat: string) {
    this.activeCategory = cat;
    this.filteredItems = this.menuItems.filter(item => item.categoria === cat);
  }

  addToCart(item: any) {
    const existing = this.cart.find(c => c.menuItemId === item.id);
    if (existing) {
      existing.cantidad += 1;
      existing.subtotal = existing.cantidad * item.precio;
    } else {
      this.cart.push({ 
        menuItemId: item.id, 
        nombre: item.nombre, // Para mostrar en el HTML
        precioHistorico: item.precio, 
        cantidad: 1,
        subtotal: item.precio,
        notasCocina: '' // Inicializamos notas vacías
      });
    }
    this.calculateTotal();
  }

  updateQuantity(index: number, delta: number) {
    const item = this.cart[index];
    item.cantidad += delta;
    item.subtotal = item.cantidad * item.precioHistorico;
    
    if (item.cantidad <= 0) this.cart.splice(index, 1);
    this.calculateTotal();
  }

  calculateTotal() {
    this.total = this.cart.reduce((acc, item) => acc + item.subtotal, 0);
  }

  async sendToKitchen() {
    const user = this.auth.getUser();
    if (this.cart.length === 0 || this.isSending || !user) return;

    this.isSending = true;

    try {
      // 1. Insertar la Orden Maestra (Usando nombres exactos de tu tabla Orden)
      const { data: order, error: orderErr } = await this.supabase
        .from('Orden')
        .insert({
          mesaId: this.selectedTable.id,    // mesaId según tu esquema
          usuarioId: user.id,              // usuarioId según tu esquema
          restauranteId: APP_CONFIG.RESTAURANT_ID,
          estado: 'ABIERTA',               // Iniciamos en ABIERTA según tu Enum
          total: this.total
        })
        .select()
        .single();

      if (orderErr) throw orderErr;

      // 2. Insertar los detalles (Usando nombres de tu tabla DetalleOrden)
      const details = this.cart.map(item => ({
        ordenId: order.id,                 // ordenId
        menuItemId: item.menuItemId,       // menuItemId
        cantidad: item.cantidad,           // cantidad
        precioHistorico: item.precioHistorico, // precioHistorico
        subtotal: item.subtotal,           // subtotal
        estadoItem: 'PENDIENTE',           // estadoItem según esquema
        notasCocina: item.notasCocina      // notasCocina
      }));

      const { error: detailErr } = await this.supabase
        .from('DetalleOrden')
        .insert(details);

      if (detailErr) throw detailErr;

      // 3. Actualizar estado de la mesa a OCUPADA
      await this.waiterSvc.updateTableStatus(this.selectedTable.id, 'OCUPADA');

      // Limpiar y salir
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
}