import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// 📦 Importamos los Enums oficiales desde el servicio del mesero
import { WaiterService, EstadoMesa, EstadoReserva } from '../../../core/services/waiter/waiter';
import { APP_CONFIG } from '../../../core/constants/config';

@Component({
  selector: 'app-table-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-map.html',
  styleUrl: './table-map.scss'
})
export class TableMap implements OnInit {
  private waiterSvc = inject(WaiterService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);

  public allTables: any[] = [];
  public isLoading = true;
  public currentFloor = 'PLANTA_BAJA';
  
  public isModalOpen = false;
  public selectedTable: any = null;
  public reservacionesConfirmadas: any[] = [];
  public mostrandoListaReservas = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initTableSubscription();
    }
  }

  initTableSubscription() {
    this.isLoading = true;
    this.waiterSvc.getTables().subscribe({
      next: (data) => {
        this.zone.run(() => {
          console.log('📊 Datos crudos de mesas recibidos:', data);
          const targetId = APP_CONFIG.RESTAURANT_ID.trim();
          
          this.allTables = data.filter(t => {
            const tableResId = String(t.restauranteId || '').trim();
            return tableResId === targetId;
          });

          console.log('✅ Mesas filtradas y asignadas al array:', this.allTables);
          this.isLoading = false;
          this.refreshDOM();
        });
      },
      error: (err) => {
        console.error('❌ Error cargando el mapa de mesas:', err);
        this.isLoading = false;
        this.refreshDOM();
      }
    });
  }

  get filteredTables() {
    if (!this.allTables || this.allTables.length === 0) return [];
    return this.allTables.filter(t => t.zona === this.currentFloor);
  }

  openActions(table: any) {
    console.log('🎯 Click detectado en Mesa:', table);
    if (!table) return;

    this.zone.run(async () => {
      this.selectedTable = table;
      this.isModalOpen = true;
      this.mostrandoListaReservas = false; 
      this.reservacionesConfirmadas = [];
      this.refreshDOM();
    });
  }

  closeModal() {
    this.zone.run(() => {
      this.isModalOpen = false;
      this.selectedTable = null;
      this.reservacionesConfirmadas = [];
      this.mostrandoListaReservas = false;
      this.refreshDOM();
    });
  }

  async cargarReservasParaMesa() {
    try {
      const targetId = APP_CONFIG.RESTAURANT_ID.trim();
      
      let query = this.waiterSvc.supabase
        .from('Reservacion')
        .select('id, nombreInvitado, numPersonas, fechaPrincipal, horaPrincipal, folio')
        .eq('restauranteId', targetId);
      if (this.selectedTable.estado === 'RESERVADA' || this.selectedTable.estado === EstadoMesa.RESERVADA) {
        query = query.eq('mesaId', String(this.selectedTable.id).trim());
      } else {
        query = query
          .eq('estado', EstadoReserva.CONFIRMADA)
          .lte('numPersonas', this.selectedTable.capacidad);
      }

      const { data, error } = await query;
      if (error) throw error;

      this.zone.run(() => {
        this.reservacionesConfirmadas = [...(data || [])];
        this.mostrandoListaReservas = true;
        this.refreshDOM();
        console.log('📅 Reservaciones cargadas con éxito:', this.reservacionesConfirmadas);
      });
    } catch (err) {
      console.error('❌ Error obteniendo reservaciones activas:', err);
    }
  }

  /**
   * 🚀 FLUJO CONTINUO CORREGIDO: ASIGNAR, SENTAR, CAMBIAR A OCUPADA Y TOMAR ORDEN DIRECTO
   */
  async asignarReservaAMesa(reservaId: string) {
    if (!this.selectedTable) return;

    try {
      this.isLoading = true;
      this.cdr.detectChanges();
      
      const mesaIdDestino = this.selectedTable.id;

      // 1. Ejecutamos el método que asienta la reservación y cambia la mesa física a 'OCUPADA'
      await this.waiterSvc.occupyAndAssignWaiter(mesaIdDestino, reservaId);
      console.log(`🚀 Éxito: Cliente sentado. Mesa ${this.selectedTable.numeroMesa} mutada a OCUPADA.`);

      // 2. Sincronizamos la mesa activa en la memoria interna de tu servicio
      this.waiterSvc.selectTable(this.selectedTable);

      // 3. Cerramos el modal de forma limpia
      this.closeModal();

      // 4. 🏃 REDIRECCIÓN AUTOMÁTICA DE EXPERIENCIA PREMIUM: 
      // Despachamos al mesero directo al formulario de comandas pasándole el ID por parámetro
      this.zone.run(() => {
        this.router.navigate(['/waiter/order-entry'], {
          queryParams: { mesa: mesaIdDestino }
        });
      });

    } catch (err) {
      console.error('❌ Error al sentar cliente con reserva:', err);
      alert('No se pudo completar el flujo relacional de asignación.');
    } finally {
      this.isLoading = false;
      this.refreshDOM();
    }
  }

  async handleAction(action: 'ORDER' | 'BILL' | 'CLEAN' | 'OCCUPY') {
    if (!this.selectedTable) return;

    try {
      switch (action) {
        case 'OCCUPY':
          this.zone.run(async () => {
            this.mostrandoListaReservas = true;
            this.refreshDOM();
            await this.cargarReservasParaMesa();
          });
          break;

        case 'ORDER':
          this.waiterSvc.selectTable(this.selectedTable);
          this.router.navigate(['/waiter/order-entry']);
          this.closeModal();
          break;

        case 'BILL':
          this.waiterSvc.selectTable(this.selectedTable);
          this.router.navigate(['/waiter/billing'], {
            queryParams: { mesaId: this.selectedTable.id }
          }); 
          this.closeModal();
          break;

        case 'CLEAN':
          await this.waiterSvc.updateTableStatus(this.selectedTable.id, EstadoMesa.LIBRE);
          this.closeModal();
          break;
      }
    } catch (err) {
      console.error(`❌ Error en acción ${action}:`, err);
    }
  }

  private refreshDOM() {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
  }
}