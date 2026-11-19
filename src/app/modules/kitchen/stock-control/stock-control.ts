import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config';

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
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
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

  // Bloquea teclas de signo negativo y notación científica en inputs numéricos
  preventNegativeKey(event: KeyboardEvent): void {
    if (event.key === '-' || event.key === 'e' || event.key === 'E') {
      event.preventDefault();
    }
  }

  // Sanitiza el valor para garantizar que nunca sea menor a 0
  onNonNegativeChange(field: 'stockActual' | 'stockMinimoAlerta', value: any): void {
    const num = Number(value);
    this.selectedIngrediente[field] = isNaN(num) || num < 0 ? 0 : num;
  }

  isFormValid(): boolean {
    const nombreValido = !!this.selectedIngrediente.nombre && this.selectedIngrediente.nombre.trim().length >= 2;
    const unidadValida = !!this.selectedIngrediente.unidad && this.selectedIngrediente.unidad.trim().length >= 1;
    const stockValido = this.selectedIngrediente.stockActual !== null &&
                        this.selectedIngrediente.stockActual !== undefined &&
                        Number(this.selectedIngrediente.stockActual) >= 0;
    const alertaValida = this.selectedIngrediente.stockMinimoAlerta !== null &&
                         this.selectedIngrediente.stockMinimoAlerta !== undefined &&
                         Number(this.selectedIngrediente.stockMinimoAlerta) >= 0;

    return nombreValido && unidadValida && stockValido && alertaValida;
  }

  openModal() {
    this.isEditing = false;
    this.selectedIngrediente = {
      nombre: '',
      stockActual: 0,
      unidad: 'kg',
      stockMinimoAlerta: 0,
      restauranteId: APP_CONFIG.RESTAURANT_ID
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

  /**
   * 🔄 Sincroniza la disponibilidad de todos los platillos en MenuItem según el stock actual de sus recetas
   */
  private async syncMenuAvailabilityByStock() {
    const { data: platillos } = await this.supabaseSvc.supabase
      .from('MenuItem')
      .select(`
        id,
        estaDisponible,
        Receta (
          cantidadUsada,
          Ingrediente (id, stockActual)
        )
      `)
      .eq('restauranteId', APP_CONFIG.RESTAURANT_ID);

    for (const p of platillos || []) {
      const receta = p.Receta || [];
      if (receta.length === 0) continue;

      const tieneInsumosSuficientes = receta.every((r: any) => {
        const stock = Number(r.Ingrediente?.stockActual ?? 0);
        const requerido = Number(r.cantidadUsada ?? 0);
        return stock > 0 && stock >= requerido;
      });

      if (p.estaDisponible !== tieneInsumosSuficientes) {
        await this.supabaseSvc.supabase
          .from('MenuItem')
          .update({ estaDisponible: tieneInsumosSuficientes })
          .eq('id', p.id);
      }
    }
  }

  async saveIngrediente() {
    if (!this.isFormValid() || this.isLoading) return;

    const stockActual = Math.max(0, Number(this.selectedIngrediente.stockActual));
    const stockMinimoAlerta = Math.max(0, Number(this.selectedIngrediente.stockMinimoAlerta));

    if (stockActual < 0 || stockMinimoAlerta < 0) {
      alert('El stock y el mínimo de alerta no pueden ser números negativos.');
      return;
    }
    
    this.isLoading = true;
    try {
      const payload = {
        ...this.selectedIngrediente,
        nombre: this.selectedIngrediente.nombre.trim(),
        unidad: this.selectedIngrediente.unidad.trim().toUpperCase(),
        stockActual,
        stockMinimoAlerta,
        restauranteId: APP_CONFIG.RESTAURANT_ID
      };

      const { error } = this.isEditing 
        ? await this.supabaseSvc.supabase
            .from('Ingrediente')
            .update(payload)
            .eq('id', payload.id)
            .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
        : await this.supabaseSvc.supabase
            .from('Ingrediente')
            .insert([payload]);

      if (error) throw error;

      // Actualiza disponibilidad de platillos en el menú según el nuevo stock
      await this.syncMenuAvailabilityByStock();

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

  async deleteItem(id: string) {
    if (!confirm('¿Seguro que deseas eliminar este insumo?')) return;
    
    try {
      const { error } = await this.supabaseSvc.supabase
        .from('Ingrediente')
        .delete()
        .eq('id', id)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID);

      if (error) throw error;
      await this.syncMenuAvailabilityByStock();
      await this.loadInventory();
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  }
}