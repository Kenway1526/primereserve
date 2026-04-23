import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Shared & Core
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 👈 Asegúrate de que el nombre del archivo sea config.ts

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
  private platformId = inject(PLATFORM_ID);

  public isModalOpen = false;
  public selectedTable: any = null;
  public currentFloor = 'PLANTA_BAJA';
  public restaurantId = APP_CONFIG.RESTAURANT_ID; // 🚀 Inicializamos con la constante
  
  public allTables: any[] = [];
  public isLoading = true;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Cargamos mesas directamente usando la constante
      await this.loadTables();
    } else {
      this.isLoading = false;
    }
  }

  async loadTables() {
    // 🛡️ Usamos la constante directamente para evitar fallos de referencia
    const targetId = APP_CONFIG.RESTAURANT_ID;

    this.isLoading = true;
    this.allTables = []; 
    this.cdr.detectChanges(); 

    try {
      // 🚀 CORRECCIÓN: Asignamos el resultado a la variable de clase
      const { data, error } = await this.supabaseSvc.supabase
        .from('Mesa')
        .select('*')
        .eq('restauranteId', targetId);

      if (error) throw error;

      if (data) {
        this.allTables = data;
        console.log('✅ Mesas cargadas:', this.allTables.length);
      }
      
    } catch (err) {
      console.error('❌ Error al obtener mesas:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); 
    }
  }

  get filteredTables() {
    return this.allTables.filter(t => t.zona === this.currentFloor);
  }

  async onDragEnd(event: DragEvent, table: any) {
    const floor = document.querySelector('.restaurant-floor') as HTMLElement;
    if (floor) {
      const rect = floor.getBoundingClientRect();
      
      table.x = Math.round(event.clientX - rect.left - 40);
      table.y = Math.round(event.clientY - rect.top - 40);
      
      try {
        await this.supabaseSvc.upsertTable(table);
      } catch (err) {
        console.error('Error al actualizar posición:', err);
      }
    }
  }

  openAddModal() {
    const maxNumber = this.allTables.reduce((max, t) => (t.numeroMesa > max ? t.numeroMesa : max), 0);
    const nextNumber = maxNumber + 1;
    
    this.selectedTable = { 
      restauranteId: APP_CONFIG.RESTAURANT_ID, // 👈 Forzado a la constante
      numeroMesa: nextNumber,
      capacidad: 2, 
      zona: this.currentFloor,
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
      // Aseguramos que el ID del restaurante vaya en el payload
      this.selectedTable.restauranteId = APP_CONFIG.RESTAURANT_ID;

      const savedTable = await this.supabaseSvc.upsertTable(this.selectedTable);

      if (savedTable) {
        // Recargamos todo para asegurar consistencia
        await this.loadTables();
      }

      this.closeModal();

    } catch (err) {
      console.error('Error en saveTable:', err);
      if (isPlatformBrowser(this.platformId)) {
        alert('No se pudieron guardar los datos.');
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

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

    if (isPlatformBrowser(this.platformId)) {
      const confirmed = confirm(`¿Estás seguro de eliminar la mesa ${this.selectedTable.numeroMesa}?`);
      
      if (confirmed) {
        this.isLoading = true;
        try {
          await this.supabaseSvc.deleteTable(this.selectedTable.id);
          this.allTables = this.allTables.filter(t => t.id !== this.selectedTable.id);
          this.closeModal();
        } catch (err) {
          console.error('Error al eliminar:', err);
        } finally {
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      }
    }
  }
}