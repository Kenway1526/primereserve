import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { WaiterService } from '../../../core/services/waiter/waiter';
import { APP_CONFIG } from '../../../core/constants/config';

@Component({
  selector: 'app-table-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-map.html',
  styleUrl: './table-map.scss'
})
export class TableMap implements OnInit {
  // Inyección de dependencias
  private waiterSvc = inject(WaiterService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // Variables de estado
  public allTables: any[] = [];
  public isLoading = true;
  public currentFloor = 'PLANTA_BAJA';
  public isModalOpen = false;
  public selectedTable: any = null;

  ngOnInit(): void {
    // Solo ejecutamos en el navegador para evitar errores de SSR con Supabase/Realtime
    if (isPlatformBrowser(this.platformId)) {
      this.initTableSubscription();
    }
  }

  /**
   * Inicializa la suscripción al servicio de mesas.
   * El servicio ya filtra internamente por restauranteId (res_001).
   */
  initTableSubscription() {
    this.isLoading = true;
    
    this.waiterSvc.getTables().subscribe({
      next: (data) => {
        console.log('📊 Datos recibidos en TableMap:', data);
        
        // Filtramos por el ID del restaurante definido en el config
        // Esto asegura que si el servicio trae más datos, solo veamos los nuestros
        this.allTables = data.filter(t => String(t.restauranteId) === APP_CONFIG.RESTAURANT_ID);
        
        // Apagamos el loader
        this.isLoading = false;
        
        // Forzamos la detección de cambios para que Angular pinte las mesas con coordenadas
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error cargando el mapa de mesas:', err);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Getter para filtrar las mesas por la zona seleccionada (P. Baja / Terraza)
   */
  get filteredTables() {
    return this.allTables.filter(t => t.zona === this.currentFloor);
  }

  /**
   * Abre el modal de acciones al hacer clic en una mesa
   */
  openActions(table: any) {
    this.selectedTable = table;
    this.isModalOpen = true;
    this.cdr.detectChanges();
  }

  /**
   * Cierra el modal de acciones
   */
  closeModal() {
    this.isModalOpen = false;
    this.selectedTable = null;
    this.cdr.detectChanges();
  }

  /**
   * Gestiona las acciones del mesero (Pedido, Cuenta, Limpieza)
   */
  async handleAction(action: 'ORDER' | 'BILL' | 'CLEAN') {
    if (!this.selectedTable) return;

    switch (action) {
      case 'ORDER':
        // Guardamos la mesa en el servicio para que OrderEntry la reconozca
        this.waiterSvc.selectTable(this.selectedTable);
        this.router.navigate(['/waiter/order-entry']);
        break;

      case 'CLEAN':
        // Cambiamos el estado a LIBRE (esto activará el color cian neón)
        try {
          await this.waiterSvc.updateTableStatus(this.selectedTable.id, 'LIBRE');
          this.closeModal();
        } catch (err) {
          console.error('Error al limpiar la mesa:', err);
        }
        break;

      case 'BILL':
        // Aquí irá la navegación a la vista de cuenta/facturación
        // this.router.navigate(['/waiter/billing']);
        console.log('Solicitando cuenta para mesa:', this.selectedTable.numeroMesa);
        this.closeModal();
        break;
    }
  }
}