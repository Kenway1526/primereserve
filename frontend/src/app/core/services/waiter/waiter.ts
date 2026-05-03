import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { SupabaseService } from '../supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 👈 Tu constante res_001
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class WaiterService {
  private platformId = inject(PLATFORM_ID);
  private supabase = inject(SupabaseService).supabase;
  private selectedTableSubject = new BehaviorSubject<any>(this.getSavedTable());

  constructor() {}

  private getSavedTable() {
    if (isPlatformBrowser(this.platformId)) {
      const table = sessionStorage.getItem('selectedTable');
      return table ? JSON.parse(table) : null;
    }
    return null; // En el servidor no hay mesa guardada
  }

  selectTable(table: any) {
    sessionStorage.setItem('selected_table', JSON.stringify(table));
    this.selectedTableSubject.next(table);
  }

  getSelectedTable() {
    return this.selectedTableSubject.value;
  }

  // 🚀 MÉTODO ROBUSTO DE CARGA
  getTables(): Observable<any[]> {
    return new Observable((observer) => {
      
      const loadTables = async () => {
        const { data, error } = await this.supabase
          .from('Mesa')
          .select('*')
          .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // 👈 Filtro directo con tu constante
          .order('numeroMesa', { ascending: true });

        if (error) {
          console.error('❌ Error Supabase:', error);
        } else {
          console.log('📊 Mesas recibidas de DB:', data);
          observer.next(data || []);
        }
      };

      loadTables();

      // Suscripción Realtime
      const channel = this.supabase
        .channel('mesas-realtime')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'Mesa', filter: `restauranteId=eq.${APP_CONFIG.RESTAURANT_ID}` }, 
          () => loadTables()
        )
        .subscribe();

      return () => this.supabase.removeChannel(channel);
    });
  }

  async updateTableStatus(tableId: string, status: string, waiterId?: string) {
    const updateData: any = { estado: status };
    
    // Si la mesa se ocupa, le asignamos el mesero
    if (status === 'OCUPADA' && waiterId) {
      updateData.mesero_id = waiterId;
    }
    
    // Si la mesa se libera, limpiamos el mesero
    if (status === 'LIBRE') {
      updateData.mesero_id = null;
    }

    return await this.supabase
      .from('Mesa')
      .update(updateData)
      .eq('id', tableId);
  }
}