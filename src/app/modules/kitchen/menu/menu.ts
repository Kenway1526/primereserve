import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config';

interface RecetaItem {
  ingredienteId: string;
  nombre: string;
  cantidadUsada: number;
  unidad: string;
  stockActual?: number;
}

interface MenuItem {
  id?: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria: string;
  imagenUrl?: string;
  estaDisponible: boolean;
  restauranteId: string;
  receta: RecetaItem[];
  Receta?: any[];
}

@Component({
  selector: 'app-menu-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss'
})
export class MenuMgmt implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public menuItems: MenuItem[] = [];
  public ingredientesCatalog: any[] = [];
  public categorias = ['Entradas', 'Platos Fuertes', 'Postres', 'Bebidas', 'Vinos'];
  
  public showModal = false;
  public isLoading = false;
  public isSaving = false;
  public currentItem: MenuItem = this.getEmptyItem();
  public searchIngrediente = '';

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.loadIngredientes();
      await this.loadMenuData();
    }
  }

  private getEmptyItem(): MenuItem {
    return {
      nombre: '',
      descripcion: '',
      precio: 0,
      categoria: 'Platos Fuertes',
      estaDisponible: true,
      imagenUrl: '',
      restauranteId: APP_CONFIG.RESTAURANT_ID,
      receta: []
    };
  }

  public onImageError(event: any) {
    event.target.src = 'assets/default-food.png';
  }

  public preventNegativeInput(event: KeyboardEvent) {
    if (event.key === '-' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  /**
   * 🔒 Verifica si todos los ingredientes de la receta tienen stock suficiente (> 0 y >= cantidadUsada)
   */
  public hasSufficientStockForCurrentItem(): boolean {
    if (!this.currentItem.receta || this.currentItem.receta.length === 0) return true;

    return this.currentItem.receta.every(r => {
      const ingCatalogo = this.ingredientesCatalog.find(i => i.id === r.ingredienteId);
      const stock = Number(ingCatalogo?.stockActual ?? r.stockActual ?? 0);
      const requerido = Number(r.cantidadUsada ?? 0);
      return stock > 0 && stock >= requerido;
    });
  }

  public getMissingIngredientsWarning(): string {
    if (!this.currentItem.receta || this.currentItem.receta.length === 0) return '';

    const faltantes = this.currentItem.receta
      .filter(r => {
        const ingCatalogo = this.ingredientesCatalog.find(i => i.id === r.ingredienteId);
        const stock = Number(ingCatalogo?.stockActual ?? r.stockActual ?? 0);
        return stock <= 0 || stock < Number(r.cantidadUsada ?? 0);
      })
      .map(r => r.nombre);

    if (faltantes.length === 0) return '';
    return `Agotado / stock insuficiente en: ${faltantes.join(', ')}. Agrega stock en Inventario para poder habilitarlo.`;
  }

  public onAvailabilityToggle(checked: boolean) {
    if (checked && !this.hasSufficientStockForCurrentItem()) {
      this.currentItem.estaDisponible = false;
      alert(this.getMissingIngredientsWarning());
      return;
    }
    this.currentItem.estaDisponible = checked;
  }

  public onRecipeQtyChange() {
    if (!this.hasSufficientStockForCurrentItem()) {
      this.currentItem.estaDisponible = false;
    }
  }

  async loadMenuData() {
    this.isLoading = true;
    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('MenuItem')
        .select(`*, Receta ( cantidadUsada, Ingrediente (id, nombre, unidad, stockActual) )`)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .order('nombre', { ascending: true });
      
      if (error) throw error;

      // Sincronizamos visualmente y en DB si algún platillo activo quedó sin stock suficiente
      const lista = data || [];
      for (const item of lista) {
        const sinStock = (item.Receta || []).some((r: any) => {
          const stock = Number(r.Ingrediente?.stockActual ?? 0);
          return stock <= 0 || stock < Number(r.cantidadUsada ?? 0);
        });

        if (sinStock && item.estaDisponible) {
          item.estaDisponible = false;
          await this.supabaseSvc.supabase
            .from('MenuItem')
            .update({ estaDisponible: false })
            .eq('id', item.id);
        }
      }

      this.menuItems = lista;
    } catch (err) {
      console.error("Error cargando menú:", err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async loadIngredientes() {
    const { data } = await this.supabaseSvc.supabase
      .from('Ingrediente')
      .select('id, nombre, unidad, stockActual')
      .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
      .order('nombre', { ascending: true });
    this.ingredientesCatalog = data || [];
  }

  async openModal(platillo?: MenuItem) {
    this.searchIngrediente = '';
    await this.loadIngredientes();

    if (platillo) {
      this.currentItem = { 
        ...platillo, 
        receta: platillo.Receta?.map((r: any) => ({
          ingredienteId: r.Ingrediente.id,
          nombre: r.Ingrediente.nombre,
          cantidadUsada: r.cantidadUsada,
          unidad: r.Ingrediente.unidad,
          stockActual: r.Ingrediente.stockActual
        })) || []
      };
      if (!this.hasSufficientStockForCurrentItem()) {
        this.currentItem.estaDisponible = false;
      }
    } else {
      this.currentItem = this.getEmptyItem();
    }
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal() { this.showModal = false; }

  get filteredIngredientes() {
    return this.ingredientesCatalog.filter(ing => 
      ing.nombre.toLowerCase().includes(this.searchIngrediente.toLowerCase())
    );
  }

  addIngrediente(ing: any) {
    if (!this.currentItem.receta.some(r => r.ingredienteId === ing.id)) {
      this.currentItem.receta.push({
        ingredienteId: ing.id,
        nombre: ing.nombre,
        cantidadUsada: 1,
        unidad: ing.unidad,
        stockActual: ing.stockActual
      });
      this.searchIngrediente = '';
      this.onRecipeQtyChange();
    }
  }

  removeIngrediente(index: number) {
    this.currentItem.receta.splice(index, 1);
  }

  async savePlatillo() {
    if (!this.currentItem.nombre || this.currentItem.precio <= 0 || this.isSaving) return;
    this.isSaving = true;

    try {
      // Bloqueo estricto antes de guardar: si no hay stock suficiente, no puede quedar disponible
      const tieneStock = this.hasSufficientStockForCurrentItem();
      if (!tieneStock) {
        this.currentItem.estaDisponible = false;
      }

      const { receta, Receta, ...payload } = this.currentItem as any;
      payload.restauranteId = APP_CONFIG.RESTAURANT_ID;
      payload.estaDisponible = tieneStock ? this.currentItem.estaDisponible : false;

      const { data: savedItem, error: itemError } = await this.supabaseSvc.supabase
        .from('MenuItem').upsert(payload).select().single();

      if (itemError) throw itemError;

      await this.supabaseSvc.supabase.from('Receta').delete().eq('menuItemId', savedItem.id);
      
      if (this.currentItem.receta.length > 0) {
        const insertData = this.currentItem.receta.map(r => ({
          menuItemId: savedItem.id,
          ingredienteId: r.ingredienteId,
          cantidadUsada: r.cantidadUsada
        }));
        await this.supabaseSvc.supabase.from('Receta').insert(insertData);
      }
      this.showModal = false;
      await this.loadMenuData();
    } catch (err) {
      console.error("Error guardando:", err);
    } finally {
      this.isSaving = false;
      this.cdr.detectChanges();
    }
  }

  async deletePlatillo(id: string) {
    if (confirm('¿Eliminar este platillo permanentemente?')) {
      await this.supabaseSvc.supabase.from('MenuItem').delete().eq('id', id);
      await this.loadMenuData();
    }
  }
}