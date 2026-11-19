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
  public supabase!: SupabaseClient;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    const supabaseUrl = 'https://uzeyiwrxccmfcalbuynr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6ZXlpd3J4Y2NtZmNhbGJ1eW5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjI5NDgsImV4cCI6MjA4NjgzODk0OH0.g-if5J361k1PJA5keyXCL_guKJ-3UrQd_wU6-jxptQs';

    if (isPlatformBrowser(this.platformId)) {
      const url = (window as any)._env?.supabaseUrl || supabaseUrl;
      const key = (window as any)._env?.supabaseKey || supabaseKey;
      this.supabase = createClient(url, key);
    } else {
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
    return await this.supabase
      .from('Reservacion')
      .insert([data]) // Mantenemos el array para asegurar consistencia
      .select()       // Esto obliga a retornar la fila creada
      .single();      // Indica que esperamos un solo objeto, no un array
  }

//==================================== reservaciones ====================================

  async findAvailableTable(restId: string, fecha: string, hora: string, zona: string, personas: number) {
  try {
    // 1. Obtener IDs de mesas que ya tienen una reservación activa en esa fecha y hora
    const { data: ocupadas, error: errorOcupadas } = await this.supabase
      .from('Reservacion')
      .select('mesaId')
      .eq('fechaPrincipal', fecha)
      .eq('horaPrincipal', hora)
      .neq('estado', 'CANCELADA');

    if (errorOcupadas) throw errorOcupadas;

    // Extraemos solo los IDs válidos
    const idsOcupados = ocupadas?.map(o => o.mesaId).filter(id => id !== null) || [];

    // 2. Buscar una mesa en la tabla 'Mesa' que:
    //    - Pertenezca al restaurante actual
    //    - Esté en la zona preferida (PLANTA_BAJA / TERRAZA)
    //    - Tenga capacidad suficiente para el número de personas
    //    - NO esté en la lista de mesas ya apartadas (idsOcupados)
    let query = this.supabase
      .from('Mesa')
      .select('id')
      .eq('restauranteId', restId)
      .eq('zona', zona)
      .gte('capacidad', personas)
      .order('capacidad', { ascending: true }); // Prioriza mesas que se ajusten mejor al tamaño del grupo

    if (idsOcupados.length > 0) {
      query = query.not('id', 'in', `(${idsOcupados.join(',')})`);
    }

    const { data: mesa, error: errorMesa } = await query.limit(1).maybeSingle();

    if (errorMesa) throw errorMesa;

    return mesa ? mesa.id : null;
  } catch (error) {
    console.error('Error en findAvailableTable:', error);
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
    const payload = {
      ...reserva,
      folio: reserva.folio || `PR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      emailInvitado: reserva.emailInvitado?.trim() || 'recepcion@primereserve.com'
    };

    // Eliminamos propiedades undefined para evitar conflictos en PostgREST
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const { data, error } = await this.supabase
      .from('Reservacion')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Error al insertar en Reservacion:', error);
      throw error;
    }

    return data;
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