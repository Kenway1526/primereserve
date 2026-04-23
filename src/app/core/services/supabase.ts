/*import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      'https://uzeyiwrxccmfcalbuynr.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZXlpd3J4Y2NtZmNhbGJ1eW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI5NDgsImV4cCI6MjA4NjgzODk0OH0.g-if5J361k1PJA5keyXCL_guKJ-3UrQd_wU6-jxptQs'
    );
  }
*/
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public supabase!: SupabaseClient; // Usamos ! para decirle a TS que se inicializará
  private platformId = inject(PLATFORM_ID);

  constructor() {
    // Definimos tus credenciales fijas aquí
    const supabaseUrl = 'https://uzeyiwrxccmfcalbuynr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZXlpd3J4Y2NtZmNhbGJ1eW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI5NDgsImV4cCI6MjA4NjgzODk0OH0.g-if5J361k1PJA5keyXCL_guKJ-3UrQd_wU6-jxptQs';

    // Solo intentamos acceder a 'window' si estamos en el navegador
    if (isPlatformBrowser(this.platformId)) {
      // Si existiera una configuración dinámica en window, la tomaría, 
      // si no, usa las de arriba.
      const url = (window as any)._env?.supabaseUrl || supabaseUrl;
      const key = (window as any)._env?.supabaseKey || supabaseKey;
      this.supabase = createClient(url, key);
    } else {
      // Si estamos en el SERVIDOR (SSR), inicializamos con las fijas
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // Las funciones aquí devolverán datos que coinciden con tus modelos de Prisma
  async getMenu() {
    const { data, error } = await this.supabase
      .from('MenuItem')
      .select('*')
      .eq('isAvailable', true);
    return { data, error };
  }

  //==================================== carga en catalogo ====================================

  async getRestaurantes() {
    const { data, error } = await this.supabase
      .from('Restaurante')
      .select('id, nombre, slug, direccion, imageUrl, categoria') 
      .order('nombre');

    if (error) {
      console.error('Error al consultar Supabase:', error);
      throw error;
    }
    return data;
  }

  async getRestauranteBySlug(slug: string) {
    return await this.supabase.from('Restaurante').select('*').eq('slug', slug).single();
  }

  async getMesasCount(restauranteId: string) {
    return await this.supabase
      .from('Mesa')
      .select('*', { count: 'exact', head: true })
      .eq('restauranteId', restauranteId);
  }

  async getReservacionesOcupadas(restauranteId: string, fecha: string, hora: string) {
    return await this.supabase
      .from('Reservacion')
      .select('*', { count: 'exact', head: true })
      .eq('restauranteId', restauranteId)
      .eq('fechaPrincipal', fecha)
      .eq('horaPrincipal', hora)
      .neq('estado', 'CANCELADA');
  }

  async createReservacion(data: any) {
    return await this.supabase.from('Reservacion').insert([data]);
  }

//==================================== reservaciones ====================================

  async findAvailableTable(restauranteId: string, fecha: string, hora: string, personas: number) {
    try {
      // 1. Obtener IDs de mesas que YA están reservadas para ese bloque de tiempo
      // Agregamos .neq('estado', 'FINALIZADA') por si quieres liberar mesas tras el servicio
      const { data: ocupadas } = await this.supabase
        .from('Reservacion')
        .select('mesaId')
        .eq('restauranteId', restauranteId)
        .eq('fechaPrincipal', fecha)
        .eq('horaPrincipal', hora)
        .not('mesaId', 'is', null)
        .not('estado', 'in', '("CANCELADA", "FINALIZADA")');

      const idsOcupados = ocupadas?.map(r => r.mesaId) || [];

      // 2. Buscar una mesa que:
      // - No esté en la lista de ocupadas para esa hora.
      // - Tenga capacidad suficiente (gte = Greater Than or Equal).
      // - Sea la más pequeña posible que quepa al grupo (para no desperdiciar mesas grandes).
      let query = this.supabase
        .from('Mesa')
        .select('id, capacidad')
        .eq('restauranteId', restauranteId)
        .gte('capacidad', personas) 
        .order('capacidad', { ascending: true }); // Prioridad: Mesa de 2 para 2 personas.

      if (idsOcupados.length > 0) {
        // Usamos el formato de filtro de Supabase para arreglos de UUIDs
        query = query.not('id', 'in', `(${idsOcupados.join(',')})`);
      }

      const { data: mesas, error } = await query.limit(1);

      if (error) throw error;

      // Retornamos el ID si existe, o null si el restaurante está lleno
      return (mesas && mesas.length > 0) ? mesas[0].id : null;

    } catch (error) {
      console.error("Error en findAvailableTable:", error);
      return null;
    }
  }

//======================================== admin - mapa de mesas ====================================

  async getTablesByRestaurant(restaurantId: string) {
    const { data, error } = await this.supabase
      .from('Mesa')
      .select('*')
      .eq('restauranteId', restaurantId);
    if (error) throw error;
    return data;
  }

  async upsertTable(table: any) {
    const { isNew, ...dataToSave } = table;

    // Limpieza de ID temporal si no es UUID
    if (dataToSave.id && dataToSave.id.length < 10) delete dataToSave.id;

    const { data, error } = await this.supabase
      .from('Mesa')
      .upsert(dataToSave)
      .select() // Esto es vital para que devuelva la fila insertada
      .single();

    if (error) throw error;
    return data; // Retorna el objeto real de la DB
  }

  async deleteTable(id: string) {
    const { error } = await this.supabase
      .from('Mesa')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  ///==================================== reservaciones ====================================

  async getReservationsByStatus(restaurantId: string, estados: string[]) {
    const { data, error } = await this.supabase
      .from('Reservacion')
      .select('*')
      .eq('restauranteId', restaurantId)
      .in('estado', estados) // Filtramos múltiples estados (ej: CONFIRMADA y WAITLIST)
      .order('fechaPrincipal', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Método para crear reserva (usado en saveReservation)
  async createReservation(reserva: any) {
    const { data, error } = await this.supabase // o el nombre que tenga tu cliente en el servicio
      .from('Reservacion')
      .insert([reserva])
      .select()
      .single();
    return { data, error };
  }

  // Método para actualizar estado (usado en cambiarEstado)
  async updateReservationStatus(id: string, nuevoEstado: string) {
    const { data, error } = await this.supabase
      .from('Reservacion')
      .update({ estado: nuevoEstado })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getReservations(restaurantId: string) {
    const { data, error } = await this.supabase
      .from('Reservacion')
      .select(`
        *,
        Mesa:fk_reservacion_mesa ( 
          numeroMesa,
          zona
        )
      `) // <--- Usamos el nombre exacto que aparece en tu tabla de SQL
      .eq('restauranteId', restaurantId)
      .order('fechaPrincipal', { ascending: true });

    if (error) {
      console.error('Error PostgREST:', error);
      throw error;
    }
    return data;
  }

  async asignarMesaAutomatica(restauranteId: string, personas: number) {
    // 1. Buscamos mesas libres con capacidad suficiente
    const { data: mesas, error } = await this.supabase
      .from('Mesa')
      .select('*')
      .eq('restauranteId', restauranteId)
      .eq('estado', 'LIBRE')
      .gte('capacidad', personas) // Capacidad mayor o igual a los comensales
      .order('capacidad', { ascending: true }) // Priorizamos la mesa más pequeña que quepa
      .limit(1);

    if (error || !mesas || mesas.length === 0) return null;

    const mesaElegida = mesas[0];

    // 2. Marcamos la mesa como RESERVADA para que nadie más la tome
    await this.supabase
      .from('Mesa')
      .update({ estado: 'RESERVADA' })
      .eq('id', mesaElegida.id);

    return mesaElegida.id;
  }

  async buscarYApartarMesa(restauranteId: string, personas: number) {
    // 1. Intentar encontrar una mesa LIBRE que quepa el grupo
    const { data: mesas, error } = await this.supabase
      .from('Mesa')
      .select('id, numeroMesa')
      .eq('restauranteId', restauranteId)
      .eq('estado', 'LIBRE')
      .gte('capacidad', personas)
      .order('capacidad', { ascending: true }) // Mesa más pequeña posible
      .limit(1);

    if (error || !mesas || mesas.length === 0) return null;

    const mesaId = mesas[0].id;

    // 2. Cambiar el estado a RESERVADA de inmediato
    await this.supabase
      .from('Mesa')
      .update({ estado: 'RESERVADA' })
      .eq('id', mesaId);

    return mesaId;
  }

  async updateTableStatus(mesaId: string, nuevoEstado: string) {
    const { error } = await this.supabase
      .from('Mesa')
      .update({ estado: nuevoEstado })
      .eq('id', mesaId);

    if (error) throw error;
    return true;
  }

  //================================= login cliente =================================

  async loginCliente(folio: string, telefono: string) {
    const { data, error } = await this.supabase
      .from('Reservacion')
      .select(`
        *,
        Mesa:fk_reservacion_mesa (
          numeroMesa,
          zona
        )
      `)
      .eq('folio', folio.toUpperCase()) // El folio siempre en mayúsculas
      .eq('telefonoInvitado', telefono)
      .single(); // Solo esperamos un resultado

    if (error) {
      console.error('Error en login:', error.message);
      return null;
    }
    return data;
  }

  async validarAccesoCliente(folio: string, telefono: string) {
    const folioClean = folio.trim().toUpperCase();
    const telClean = telefono.trim();

    console.log('--- DEBUG SUPABASE ---');
    console.log('Buscando Folio:', folioClean);
    console.log('Buscando Teléfono:', telClean);

    return await this.supabase
      .from('Reservacion')
      .select(`
        *,
        Mesa:fk_reservacion_mesa (
          numeroMesa,
          zona
        )
      `)
      .eq('folio', folioClean)
      .eq('telefonoInvitado', telClean)
      .single();
  }

  async getReservaPorId(id: string) {
    // Usamos el alias exacto que funcionó en el panel de admin
    return await this.supabase
      .from('Reservacion')
      .select(`
        *,
        Mesa:fk_reservacion_mesa (
          numeroMesa,
          zona
        )
      `)
      .eq('id', id)
      .single();
  }

//================================= staff mgmt (admin) =================================

  async getStaffMembers() {
    const restauranteId = localStorage.getItem('active_restaurant_id');
    return await this.supabase
      .from('Usuario')
      .select('*')
      .eq('restauranteId', restauranteId)
      .neq('rol', 'CLIENTE') // <--- Discriminamos al cliente aquí
      .order('nombre', { ascending: true });
  }

//==================================== ordenes ====================================

  async getActiveOrders(restauranteId: string) {
    const { data, error } = await this.supabase
      .from('Orden')
      .select(`
        *,
        DetalleOrden (
          id,
          cantidad,
          notasCocina,
          estadoItem,
          menuItemId,
          MenuItem:menuItemId ( nombre )
        )
      `)
      .eq('restauranteId', restauranteId)
      .neq('estado', 'FINALIZADA') // Solo lo que está en proceso
      .order('fechaApertura', { ascending: true });

    if (error) throw error;
    return data;
  }

  // Suscribirse a cambios en tiempo real
  subscribeToOrders(restauranteId: string, callback: (payload: any) => void) {
    return this.supabase
      .channel('cocina-realtime')
      .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'Orden' }, 
          callback)
      .subscribe();
  }
}