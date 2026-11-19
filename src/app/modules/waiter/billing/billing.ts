import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase';
import { WaiterService } from '../../../core/services/waiter/waiter';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './billing.html',
  styleUrl: './billing.scss'
})
export class Billing implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService).supabase;
  private waiterSvc = inject(WaiterService);
  public router = inject(Router);
  private route = inject(ActivatedRoute); 
  private cdr = inject(ChangeDetectorRef);
  private zone = inject(NgZone);

  public order: any = null;
  public isLoading = true;
  public targetMesaId: string | null = null;
  private realtimeChannel: any;
  
  // Totales de la Orden
  public subtotal = 0;
  public iva = 0;
  public propina = 0;
  public totalFinal = 0;

  // Variables de Caja Multi-modal
  public tipoDivision: 'TOTAL' | 'EQUITA' | 'PLATILLO' = 'TOTAL';
  public metodoPago: 'EFECTIVO' | 'TARJETA' = 'EFECTIVO';
  public numPersonas = 2;
  public totalPorPersona = 0;

  // Control Cobro por Ítem Individual
  public itemsParaCobrar: any[] = []; 

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.targetMesaId = params['mesaId'];
      if (!this.targetMesaId) {
        const savedTable = this.waiterSvc.getSelectedTable();
        this.targetMesaId = savedTable ? savedTable.id : null;
      }
      if (!this.targetMesaId) {
        this.zone.run(() => { this.router.navigate(['/waiter/table-map']); });
        return;
      }
      this.loadOrderData();
      this.setupRealtime();
    });
  }

  /**
   * 🔒 Verifica que la orden completa y todos sus platillos hayan sido entregados en mesa ('SERVIDO')
   */
  public get isOrderServed(): boolean {
    if (!this.order) return false;
    const detalles = this.order.DetalleOrden || [];
    if (detalles.length === 0) return false;

    const ordenServida = this.order.estado === 'SERVIDO';
    const todosPlatillosServidos = detalles.every((d: any) => d.estadoItem === 'SERVIDO');

    return ordenServida && todosPlatillosServidos;
  }

  public get pendingStatusMessage(): string {
    if (!this.order) return '';
    if (this.order.estado === 'LISTO') {
      return 'Los alimentos están listos en barra. Márcalos como SERVIDOS antes de cobrar.';
    }
    return 'Aún hay alimentos pendientes o en preparación en cocina. No se puede cerrar la mesa hasta entregarlos.';
  }

  setupRealtime() {
    if (!this.targetMesaId || this.realtimeChannel) return;
    const chanId = `billing_rt_${this.targetMesaId.substring(0, 6)}`;

    this.realtimeChannel = this.supabase
      .channel(chanId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Orden',
        filter: `mesaId=eq.${this.targetMesaId}`
      }, () => this.loadOrderData())
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'DetalleOrden'
      }, () => this.loadOrderData())
      .subscribe();
  }

  async loadOrderData() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabase
        .from('Orden')
        .select(`
          *,
          Mesa (numeroMesa),
          DetalleOrden (
            id,
            cantidad,
            precioHistorico,
            subtotal,
            estadoItem,
            menuItemId,
            MenuItem (nombre)
          )
        `)
        .eq('mesaId', this.targetMesaId)
        .neq('estado', 'PAGADO') 
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.order = data;
        this.calculateTotals(data.total);
        
        this.itemsParaCobrar = (data.DetalleOrden || []).map((i: any) => ({
          ...i,
          cantidadAPagar: i.cantidad, 
          seleccionado: false
        }));

      } else {
        this.goBack();
      }
    } catch (err) {
      console.error('❌ Error crítico cargando cuenta:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  calculateTotals(baseTotal: number) {
    this.subtotal = baseTotal;
    this.iva = baseTotal * 0.16;
    this.propina = baseTotal * 0.10;
    this.totalFinal = this.subtotal + this.iva + this.propina;
    this.recalcularPartes();
  }

  cambiarDivision(modalidad: 'TOTAL' | 'EQUITA' | 'PLATILLO') {
    this.tipoDivision = modalidad;
    this.recalcularPartes();
  }

  modificarPersonas(cambio: number) {
    this.numPersonas += cambio;
    if (this.numPersonas < 2) this.numPersonas = 2;
    this.recalcularPartes();
  }

  toggleItemSeleccionado(item: any) {
    item.seleccionado = !item.seleccionado;
    this.recalcularPartes();
  }

  recalcularPartes() {
    if (this.tipoDivision === 'TOTAL') {
      this.totalPorPersona = this.totalFinal;
    } else if (this.tipoDivision === 'EQUITA') {
      this.totalPorPersona = this.totalFinal / this.numPersonas;
    } else if (this.tipoDivision === 'PLATILLO') {
      const subtotalSeleccionado = this.itemsParaCobrar
        .filter(i => i.seleccionado)
        .reduce((sum, i) => sum + i.subtotal, 0);

      if (subtotalSeleccionado === 0) {
        this.totalPorPersona = 0;
      } else {
        const ivaItem = subtotalSeleccionado * 0.16;
        const propinaItem = subtotalSeleccionado * 0.10;
        this.totalPorPersona = subtotalSeleccionado + ivaItem + propinaItem;
      }
    }
    this.cdr.detectChanges();
  }

  async processPayment() {
    if (!this.order || !this.isOrderServed) {
      alert(this.pendingStatusMessage || 'No puedes cobrar hasta que todos los platillos estén servidos.');
      return;
    }
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      if (this.tipoDivision === 'TOTAL' || this.tipoDivision === 'EQUITA') {
        await this.ejecutarCierreTotalMesa();
      } else {
        const itemsSeleccionados = this.itemsParaCobrar.filter(i => i.seleccionado);
        if (itemsSeleccionados.length === 0) {
          alert('Por favor selecciona al menos un platillo para cobrar.');
          this.isLoading = false;
          return;
        }

        this.itemsParaCobrar = this.itemsParaCobrar.filter(i => !i.seleccionado);

        alert(`Pago Parcial Registrado!\nMonto cobrado vía ${this.metodoPago}: ${this.totalPorPersona.toFixed(2)}`);

        if (this.itemsParaCobrar.length === 0) {
          await this.ejecutarCierreTotalMesa();
        } else {
          const subtotalRestante = this.itemsParaCobrar.reduce((sum, i) => sum + i.subtotal, 0);
          this.calculateTotals(subtotalRestante);
          this.tipoDivision = 'PLATILLO';
          this.recalcularPartes();
          this.isLoading = false;
        }
      }
    } catch (err: any) {
      console.error("💥 Falla crítica capturada en processPayment:", err);
      alert(`Error al procesar el pago: ${err.message}`);
      this.isLoading = false;
    } finally {
      this.cdr.detectChanges();
    }
  }

  private async ejecutarCierreTotalMesa() {
    const { error: ordenErr } = await this.supabase
      .from('Orden')
      .update({ estado: 'PAGADO', fechaCierre: new Date().toISOString() })
      .eq('id', this.order.id);

    if (ordenErr) throw ordenErr;

    await this.waiterSvc.finalizarServicioMesa(this.order.mesaId);
    alert(`¡Cuenta Liquidada al 100%!\nMesa liberada a estado SUCIA.`);
    
    this.zone.run(() => {
      this.router.navigate(['/waiter/table-map']);
    });
  }
  
  goBack() {
    this.zone.run(() => { this.router.navigate(['/waiter/table-map']); });
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }
}