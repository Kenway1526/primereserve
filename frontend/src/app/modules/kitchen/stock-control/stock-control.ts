import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 🚀 Sincronización con la constante

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './stock-control.html',
  styleUrl: './stock-control.scss'
})
export class StockControl implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public items: any[] = [];
  public criticalCount: number = 0;
  public isLoading = true;

  public showModal = false;
  public isEditing = false;
  public selectedIngrediente: any = {};

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // 🚀 Cargamos directamente usando la constante estática
      await this.loadInventory();
    }
  }

  async loadInventory() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('Ingrediente')
        .select('*')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // 👈 Sincronizado para CARGAR
        .order('nombre', { ascending: true });

      if (error) throw error;
      
      this.items = data || [];
      this.criticalCount = this.items.filter(i => i.stockActual <= i.stockMinimoAlerta).length;
      
    } catch (err) {
      console.error('Error al cargar inventario:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  openModal() {
    this.isEditing = false;
    // 🛡️ Inicializamos con el ID estático y dejamos que Supabase genere el UUID si prefieres
    this.selectedIngrediente = {
      nombre: '',
      stockActual: 0,
      unidad: 'kg', // Valor por defecto común
      stockMinimoAlerta: 0,
      restauranteId: APP_CONFIG.RESTAURANT_ID // 👈 Sincronizado para NUEVOS
    };
    this.showModal = true;
  }

  editItem(item: any) {
    this.isEditing = true;
    this.selectedIngrediente = { ...item };
    this.showModal = true;
  }

  closeModal() { 
    this.showModal = false; 
    this.cdr.detectChanges();
  }

  async saveIngrediente() {
    if (!this.selectedIngrediente.nombre || this.isLoading) return;
    
    this.isLoading = true;
    try {
      // 🛡️ Forzamos que el restauranteId sea el correcto antes de enviar
      this.selectedIngrediente.restauranteId = APP_CONFIG.RESTAURANT_ID;

      const { error } = this.isEditing 
        ? await this.supabaseSvc.supabase
            .from('Ingrediente')
            .update(this.selectedIngrediente)
            .eq('id', this.selectedIngrediente.id)
            .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // Seguridad extra
        : await this.supabaseSvc.supabase
            .from('Ingrediente')
            .insert([this.selectedIngrediente]);

      if (error) throw error;

      console.log('📦 Inventario actualizado en:', APP_CONFIG.RESTAURANT_NAME);
      this.closeModal();
      await this.loadInventory();

    } catch (err: any) {
      alert('Error al guardar ingrediente: ' + (err.message || err));
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Opcional: Método para eliminar ingredientes
  async deleteItem(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este insumo?')) return;
    
    try {
      const { error } = await this.supabaseSvc.supabase
        .from('Ingrediente')
        .delete()
        .eq('id', id)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID);

      if (error) throw error;
      await this.loadInventory();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  }
}