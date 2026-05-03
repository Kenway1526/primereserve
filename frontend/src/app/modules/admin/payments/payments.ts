import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 🚀 Importación de la constante

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payments.html',
  styleUrl: './payments.css'
})
export class Payments implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public pendingPayments: any[] = [];
  public totalVentasDia: number = 0;
  
  // 🚀 Sincronizamos el ID directamente con la constante estática
  private restaurantId: string = APP_CONFIG.RESTAURANT_ID;

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Ya no buscamos en localStorage, vamos directo a la carga
      await this.loadPendingOrders();
    }
  }

  async loadPendingOrders() {
    try {
      this.pendingPayments = [];
      
      const { data, error } = await this.supabaseSvc.supabase
        .from('Orden')
        .select(`
          *,
          Mesa ( numeroMesa ),
          DetalleOrden (
            id,
            cantidad,
            precioHistorico,
            subtotal,
            MenuItem ( nombre )
          )
        `)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // 👈 Sincronizado para CARGAR
        .in('estado', ['LISTO', 'SERVIDO'])
        .order('fechaApertura', { ascending: false });

      if (error) throw error;

      this.pendingPayments = data || [];
      
      // Calculamos el acumulado del día basado solo en este restaurante
      this.totalVentasDia = this.pendingPayments.reduce((acc, o) => acc + (o.total || 0), 0);
      
    } catch (err) {
      console.error('Error SQL Pagos:', err);
    } finally {
      this.cdr.detectChanges();
    }
  }

  async processPayment(orderId: string) {
    // 🛡️ Antes de procesar, verificamos que el ID del restaurante sea el correcto (doble check)
    try {
      const { error } = await this.supabaseSvc.supabase
        .from('Orden')
        .update({ 
          estado: 'PAGADO',
          fechaCierre: new Date().toISOString() // O new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID); // 👈 Seguridad extra al actualizar

      if (error) throw error;
      
      console.log('💰 Pago procesado para el restaurante:', APP_CONFIG.RESTAURANT_NAME);
      await this.loadPendingOrders();
      
    } catch (err) {
      console.error('Error al liquidar:', err);
    } finally {
      this.cdr.detectChanges();
    }
  }
}