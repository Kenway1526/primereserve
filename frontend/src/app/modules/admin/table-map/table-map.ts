import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';
import { Router } from '@angular/router';

@Component({
  selector: 'app-table-map',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './table-map.html',
  styleUrl: './table-map.scss'
})
export class TableMap implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  public isModalOpen = false;
  public selectedTable: any = null;
  public currentFloor = 'PLANTA_BAJA'; // 'PLANTA_BAJA' o 'TERRAZA'
  public restaurantId = localStorage.getItem('active_restaurant_id') || ''; // Valor por defecto para evitar errores iniciales
  
  public allTables: any[] = []; // Ahora inicia vacío
  public isLoading = true;

  async ngOnInit() {
    const storedId = localStorage.getItem('active_restaurant_id');
    
    if (!storedId || storedId === '1') {
      console.warn('ID no válido detectado. Redirigiendo al catálogo para re-seleccionar.');
      this.router.navigate(['/catalog']);
      return;
    }

    this.restaurantId = storedId; 
    await this.loadTables();
  }

  async loadTables() {
    this.isLoading = true;
    this.allTables = []; // Limpiamos para evitar residuos
    this.cdr.detectChanges(); 

    try {
      const data = await this.supabaseSvc.getTablesByRestaurant(this.restaurantId);
      this.allTables = data || [];
      console.log('Mesas cargadas:', this.allTables.length);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      this.isLoading = false;
      // IMPORTANTE: Forzamos a Angular a pintar los nuevos datos
      this.cdr.detectChanges(); 
    }
  }

  get filteredTables() {
    return this.allTables.filter(t => t.zona === this.currentFloor);
  }

  // Al soltar la mesa, guardamos la nueva posición automáticamente
  async onDragEnd(event: DragEvent, table: any) {
    const floor = document.querySelector('.restaurant-floor') as HTMLElement;
    if (floor) {
      const rect = floor.getBoundingClientRect();
      // Usamos Math.round para eliminar los decimales que causan el error 400
      table.x = Math.round(event.clientX - rect.left - 40);
      table.y = Math.round(event.clientY - rect.top - 40);
      
      try {
        // Ahora enviamos datos limpios a Supabase
        await this.supabaseSvc.upsertTable(table);
        console.log(`Mesa ${table.numeroMesa} actualizada en posición entera:`, table.x, table.y);
      } catch (err) {
        console.error('Error al guardar posición:', err);
      }
    }
  }

  openAddModal() {
    const maxNumber = this.allTables.reduce((max, t) => (t.numeroMesa > max ? t.numeroMesa : max), 0);
    const nextNumber = maxNumber + 1;
    
    this.selectedTable = { 
      restauranteId: this.restaurantId,
      numeroMesa: nextNumber,
      capacidad: 2, 
      zona: this.currentFloor, // PLANTA_BAJA o TERRAZA
      estado: 'LIBRE', 
      x: 150, 
      y: 150, 
      forma: 'cuadrada'
    };
    this.isModalOpen = true;
  }

  openEditModal(table: any) {
    this.selectedTable = { ...table }; 
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  async saveTable() {
    if (!this.selectedTable || this.isLoading) return;

    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      // Enviamos la copia editada al servicio
      const savedTable = await this.supabaseSvc.upsertTable(this.selectedTable);

      if (savedTable) {
        // Buscamos la mesa original en el array local por su ID
        const index = this.allTables.findIndex(t => t.id === savedTable.id);
        
        if (index !== -1) {
          // ACTUALIZACIÓN: Reemplazamos los datos viejos por los nuevos de la DB
          this.allTables[index] = { ...savedTable };
        } else {
          // CREACIÓN: Si no existía (raro en edición, común en nueva), la añadimos
          this.allTables = [...this.allTables, savedTable];
        }
      }

      this.closeModal(); // Cerramos y limpiamos

    } catch (err) {
      console.error('Error al editar mesa:', err);
      alert('No se pudieron actualizar los datos de la mesa.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Función para resetear el estado del modal de forma segura
  closeModal() {
    this.isModalOpen = false;
    this.selectedTable = null;
    this.cdr.detectChanges();
  }

  getTableStyles(table: any) {
    return {
      'left.px': table.x,
      'top.px': table.y,
      'border-radius': table.forma === 'circular' ? '50%' : '4px'
    };
  }

  async deleteTable() {
    if (!this.selectedTable?.id) return;

    // Una confirmación nativa simple para evitar borrados accidentales
    const confirmed = confirm(`¿Estás seguro de eliminar la mesa ${this.selectedTable.numeroMesa}?`);
    
    if (confirmed) {
      this.isLoading = true;
      try {
        // 1. Llamada al servicio (debes tener este método en el SupabaseService)
        await this.supabaseSvc.deleteTable(this.selectedTable.id);

        // 2. Eliminarla del array local para que desaparezca del mapa de inmediato
        this.allTables = this.allTables.filter(t => t.id !== this.selectedTable.id);
        
        // 3. Cerrar el modal
        this.closeModal();
        
        console.log('Mesa eliminada con éxito');
      } catch (err) {
        console.error('Error al eliminar:', err);
        alert('No se pudo eliminar la mesa. Inténtalo de nuevo.');
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }
  }
}