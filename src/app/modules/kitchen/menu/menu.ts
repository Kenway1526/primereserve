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
}

interface MenuItem {
  id?: string;
  nombre: string;
  descripcion?: string; // 👈 Campo de descripción
  precio: number;
  categoria: string;
  imagenUrl?: string;   // 👈 Campo de imagen
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
      await this.loadMenuData();
      await this.loadIngredientes();
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

  async loadMenuData() {
    this.isLoading = true;
    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('MenuItem')
        .select(`*, Receta ( cantidadUsada, Ingrediente (id, nombre, unidad, stockActual) )`)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      this.menuItems = data || [];
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

  openModal(platillo?: MenuItem) {
    this.searchIngrediente = '';
    if (platillo) {
      this.currentItem = { 
        ...platillo, 
        receta: platillo.Receta?.map((r: any) => ({
          ingredienteId: r.Ingrediente.id,
          nombre: r.Ingrediente.nombre,
          cantidadUsada: r.cantidadUsada,
          unidad: r.Ingrediente.unidad
        })) || []
      };
    } else {
      this.currentItem = this.getEmptyItem();
    }
    this.showModal = true;
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
        unidad: ing.unidad
      });
      this.searchIngrediente = '';
    }
  }

  removeIngrediente(index: number) {
    this.currentItem.receta.splice(index, 1);
  }

  async savePlatillo() {
    if (!this.currentItem.nombre || this.isSaving) return;
    this.isSaving = true;

    try {
      const { receta, Receta, ...payload } = this.currentItem as any;
      payload.restauranteId = APP_CONFIG.RESTAURANT_ID;

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