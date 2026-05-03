import { inject, Injectable } from '@angular/core';
import { SupabaseService } from '../supabase';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private supabase = inject(SupabaseService);

  // 1. Obtener Platillos con su disponibilidad de Stock real
  async getMenuItemsConStock() {
    const { data: items } = await this.supabase.supabase
      .from('MenuItem')
      .select('*')
      .eq('estaDisponible', true);
    
    return items || [];
  }

  // 2. Validar si hay stock suficiente para un item antes de agregarlo al carrito
  async validarStockItem(menuItemId: string, cantidad: number): Promise<{apto: boolean, error?: string}> {
    const { data: recetas } = await this.supabase.supabase
      .from('Receta')
      .select('cantidadUsada, ingredienteId, Ingrediente(stockActual, nombre)')
      .eq('menuItemId', menuItemId);

    if (!recetas) return { apto: true }; // Si no tiene receta, asumimos stock infinito (ej. servicios)

    for (const r of recetas) {
      const stockNecesario = r.cantidadUsada * cantidad;
      const stockDisponible = (r.Ingrediente as any).stockActual;
      if (stockDisponible < stockNecesario) {
        return { apto: false, error: `Insuficiente: ${(r.Ingrediente as any).nombre}` };
      }
    }
    return { apto: true };
  }

  // 3. Crear Orden y DetalleOrden (Flujo Enviar a Cocina)
  async enviarPedido(mesaId: string, carrito: any[], usuarioId: string, restauranteId: string, reservacionId?: string) {
    // A. Buscar Orden Abierta
    let { data: orden } = await this.supabase.supabase
      .from('Orden')
      .select('id')
      .eq('mesaId', mesaId)
      .eq('estado', 'ABIERTA')
      .maybeSingle();

    if (!orden) {
      const { data: nuevaOrden } = await this.supabase.supabase
        .from('Orden')
        .insert({
          id: crypto.randomUUID(),
          mesaId,
          usuarioId,
          restauranteId,
          reservacionId,
          estado: 'ABIERTA'
        }).select().single();
      orden = nuevaOrden;
    }

    // B. Insertar en DetalleOrden y restar Stock
    for (const item of carrito) {
      await this.supabase.supabase.from('DetalleOrden').insert({
        id: crypto.randomUUID(),
        ordenId: orden!.id,
        menuItemId: item.id,
        cantidad: item.cantidad,
        precioHistorico: item.precio,
        subtotal: item.precio * item.cantidad,
        estadoItem: 'PENDIENTE'
      });

      // Restar stock automáticamente según Receta
      const { data: recetas } = await this.supabase.supabase
        .from('Receta')
        .select('ingredienteId, cantidadUsada')
        .eq('menuItemId', item.id);

      if (recetas) {
        for (const r of recetas) {
          const { data: ing } = await this.supabase.supabase
            .from('Ingrediente')
            .select('stockActual')
            .eq('id', r.ingredienteId)
            .single();
          
          await this.supabase.supabase
            .from('Ingrediente')
            .update({ stockActual: ing!.stockActual - (r.cantidadUsada * item.cantidad) })
            .eq('id', r.ingredienteId);
        }
      }
    }
    
    // C. Cambiar estado de mesa
    await this.supabase.supabase.from('Mesa').update({ estado: 'OCUPADA' }).eq('id', mesaId);
  }
}