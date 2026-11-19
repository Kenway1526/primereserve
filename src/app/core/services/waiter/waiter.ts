import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from '../supabase';
import { APP_CONFIG } from '../../../core/constants/config'; 
import { isPlatformBrowser } from '@angular/common';

/* --- ENUMS OFICIALES DE LA BASE DE DATOS (SUPABASE) --- */
export enum EstadoMesa {
  LIBRE = 'LIBRE',
  OCUPADA = 'OCUPADA',
  SUCIA = 'SUCIA',
  RESERVADA = 'RESERVADA'
}

export enum EstadoReserva {
  WAITLIST = 'WAITLIST',
  CONFIRMADA = 'CONFIRMADA',
  SENTADO = 'SENTADO',
  CANCELADA = 'CANCELADA',
  COMPLETADA = 'COMPLETADA',
  PENDIENTE_CONFIRMAR = 'PENDIENTE_CONFIRMAR'
}

@Injectable({
  providedIn: 'root'
})
export class WaiterService {
  private platformId = inject(PLATFORM_ID);
  public supabase = inject(SupabaseService).supabase;
  private selectedTableSubject = new BehaviorSubject<any>(this.getSavedTable());

  constructor() {}

  private getSavedTable() {
    if (isPlatformBrowser(this.platformId)) {
      const table = sessionStorage.getItem('selected_table');
      return table ? JSON.parse(table) : null;
    }
    return null;
  }

  selectTable(table: any) {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('selected_table', JSON.stringify(table));
    }
    this.selectedTableSubject.next(table);
  }

  getSelectedTable() {
    return this.selectedTableSubject.value;
  }

  /**
   * 🚀 CARGA DE MESAS BLINDADA CONTRA ERRORES DE REALTIME
   */
  getTables(): Observable<any[]> {
    return new Observable((observer) => {
      
      const loadTables = async () => {
        try {
          const { data, error } = await this.supabase
            .from('Mesa')
            .select('*')
            .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) 
            .order('numeroMesa', { ascending: true });

          if (error) throw error;
          
          console.log('📊 Mesas recibidas de DB:', data);
          observer.next(data || []);
        } catch (err) {
          console.error('❌ Error cargando mesas en servicio:', err);
        }
      };

      // Ejecución de la carga inicial de datos
      loadTables();

      // Identificador único por instancia para evitar colisiones en Realtime
      const uniqueChannelId = `mesas_realtime_${Math.random().toString(36).substring(2, 9)}`;
      
      const channel = this.supabase
        .channel(uniqueChannelId)
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'Mesa', 
            filter: `restauranteId=eq.${APP_CONFIG.RESTAURANT_ID}` 
          }, 
          (payload) => {
            console.log('🔄 Cambio Realtime detectado en caliente:', payload);
            loadTables();
          }
        );

      channel.subscribe((status) => {
        console.log(`🔌 Estado de la conexión del canal Realtime [${uniqueChannelId}]:`, status);
      });

      return () => {
        console.log(`🗑 Limpiando y removiendo canal Realtime: ${uniqueChannelId}`);
        this.supabase.removeChannel(channel);
      };
    });
  }

  /**
   * 🧼 ACTUALIZACIÓN DE ESTADO FÍSICO DE MESA
   * Cambia el color neón del mapa en tiempo real (LIBRE, SUCIA, etc.)
   */
  async updateTableStatus(tableId: string, status: EstadoMesa) {
    return await this.supabase
      .from('Mesa')
      .update({ estado: status })
      .eq('id', tableId);
  }

  /**
   * 🔒 CIERRE DE CUENTA Y LIBERACIÓN DE SERVICIO
   * Cambia la reservación a COMPLETADA y manda la mesa física a limpieza (SUCIA)
   */
  async finalizarServicioMesa(tableId: string) {
    // 1. Cerramos la reservación del cliente que estaba ocupando la mesa
    await this.supabase
      .from('Reservacion')
      .update({ estado: EstadoReserva.COMPLETADA })
      .eq('mesaId', tableId)
      .eq('estado', EstadoReserva.SENTADO);

    // 2. Transicionamos la mesa física al estado SUCIA (Naranja Neón)
    return await this.updateTableStatus(tableId, EstadoMesa.SUCIA);
  }

  async occupyAndAssignWaiter(mesaId: string, reservaId: string): Promise<any> {
    let finalWaiterId: string = ''; 

    try {
      const sessionUser = sessionStorage.getItem('current_user');
      if (sessionUser) {
        const userObj = JSON.parse(sessionUser);
        finalWaiterId = userObj.id;
        console.log(`🎯 Mesero detectado: ${userObj.nombre} (ID: ${finalWaiterId})`);
      }
    } catch (e) {
      console.error('Error recuperando la sesión local del staff:', e);
    }

    if (!finalWaiterId) {
      finalWaiterId = '00000000-0000-0000-0000-000000000000';
    }

    // 1. Transición de la Reservación: Pasa de Confirmada/Pendiente a SENTADO
    const { error: resError } = await this.supabase
      .from('Reservacion')
      .update({ 
        estado: 'SENTADO', 
        meseroId: finalWaiterId, 
        mesaId: mesaId 
      })
      .eq('id', reservaId);

    if (resError) throw resError;

    // 2. Transición de la Mesa Física: Cambia estrictamente a OCUPADA (Teñir Mapa de Rojo)
    const { error: mesaError } = await this.supabase
      .from('Mesa')
      .update({ estado: 'OCUPADA' }) // 🎯 Aseguramos el estado definitivo de consumo
      .eq('id', mesaId);

    if (mesaError) throw mesaError;

    // Devolvemos éxito para que el componente ejecute la redirección de inmediato
    return { success: true, mesaId: mesaId };
  }
}