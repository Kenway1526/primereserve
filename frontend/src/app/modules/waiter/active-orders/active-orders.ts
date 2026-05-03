import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { Auth } from '../../../core/services/auth/auth';
import { APP_CONFIG } from '../../../core/constants/config';

@Component({
  selector: 'app-active-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-orders.html',
  styleUrl: './active-orders.css'
})
export class ActiveOrders implements OnInit {
  private supabase = inject(SupabaseService).supabase;
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  public activeOrders: any[] = [];
  public isLoading = true;

  ngOnInit() {
    this.loadActiveOrders();
    this.setupRealtime();
  }

  async loadActiveOrders() {
    this.isLoading = true;
    const user = this.auth.getUser();

    if (!user) {
      this.isLoading = false;
      return;
    }

    // Corregido: mesaId en lugar de mesald
    const { data, error } = await this.supabase
      .from('Orden')
      .select(`
        id,
        estado,
        total,
        fechaApertura,
        mesaId, 
        Mesa (
          numeroMesa,
          zona
        ),
        DetalleOrden (
          id,
          cantidad,
          estadoItem,
          MenuItem (
            nombre
          )
        )
      `)
      .eq('usuarioId', user.id)
      .eq('restauranteId', APP_CONFIG.RESTAURANT_ID)
      .neq('estado', 'PAGADO');

    if (error) {
      console.error('Error de Mapeo corregido:', error);
      this.activeOrders = [];
    } else {
      this.activeOrders = data || [];
    }
    
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  setupRealtime() {
    const user = this.auth.getUser();
    if (!user) return;

    // Corregido: El orden debe ser .on().on().subscribe()
    this.supabase
      .channel('waiter-orders-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'Orden',
        filter: `usuarioId=eq.${user.id}` 
      }, () => this.loadActiveOrders())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'DetalleOrden'
      }, () => this.loadActiveOrders())
      .subscribe(); // El subscribe() siempre va AL FINAL
  }

  async markAsServed(orderId: string) {
    const { error } = await this.supabase
      .from('Orden')
      .update({ estado: 'SERVIDA' })
      .eq('id', orderId);
    
    if (!error) this.loadActiveOrders();
  }
}