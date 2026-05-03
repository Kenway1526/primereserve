import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { WaiterService } from '../../../core/services/waiter/waiter';
import { Router } from '@angular/router';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './billing.html',
  styleUrl: './billing.scss'
})
export class Billing implements OnInit {
  private supabase = inject(SupabaseService).supabase;
  private waiterSvc = inject(WaiterService);
  public router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  public order: any = null;
  public isLoading = true;
  
  // Totales calculados dinámicamente
  public subtotal = 0;
  public iva = 0;
  public propina = 0;
  public totalFinal = 0;

  ngOnInit() {
    this.loadOrderData();
  }

  async loadOrderData() {
    const selectedTable = this.waiterSvc.getSelectedTable();
    if (!selectedTable) {
      this.router.navigate(['/waiter/table-map']);
      return;
    }

    const { data, error } = await this.supabase
      .from('Orden')
      .select(`
        *,
        Mesa (numeroMesa),
        DetalleOrden (
          cantidad,
          precioHistorico,
          subtotal,
          MenuItem (nombre)
        )
      `)
      .eq('mesaId', selectedTable.id)
      .neq('estado', 'PAGADO') // Solo órdenes que no han sido liquidadas
      .single();

    if (data) {
      this.order = data;
      this.calculateTotals(data.total);
    }
    this.isLoading = false;
    this.cdr.detectChanges();
  }

  calculateTotals(baseTotal: number) {
    this.subtotal = baseTotal;
    this.iva = baseTotal * 0.16; // IVA 16%
    this.propina = baseTotal * 0.10; // Propina Sugerida 10%
    this.totalFinal = this.subtotal + this.iva + this.propina;
  }

  async processPayment() {
    this.isLoading = true;

    // 1. Actualizar Orden a PAGADO y poner fecha de cierre
    const updateOrden = await this.supabase
      .from('Orden')
      .update({ 
        estado: 'PAGADO',
        fechaCierre: new Date().toISOString()
      })
      .eq('id', this.order.id);

    // 2. Actualizar Mesa a SUCIA
    const updateMesa = await this.supabase
      .from('Mesa')
      .update({ estado: 'SUCIA' })
      .eq('id', this.order.mesaId);

    if (!updateOrden.error && !updateMesa.error) {
      this.router.navigate(['/waiter/table-map']);
    } else {
      alert("Error al procesar el pago");
      this.isLoading = false;
    }
  }
  
  goBack() {
    this.router.navigate(['/waiter/table-map']);
  }
}