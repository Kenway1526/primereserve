import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../core/services/order/order';
import { Auth } from '../../../core/services/auth/auth';

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-entry.html',
  styleUrl: './order-entry.scss'
})
export class OrderEntry implements OnInit { // 🟢 Asegúrate que este nombre coincida con las rutas
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderSvc = inject(OrderService);
  private auth = inject(Auth);
  private cdr = inject(ChangeDetectorRef);

  // Propiedades públicas para que el HTML pueda verlas
  public mesaId: string = '';
  public numeroMesa: string = '';
  public menuItems: any[] = [];
  public carrito: any[] = [];
  public total: number = 0;
  public isLoading: boolean = true;

  async ngOnInit() {
    this.mesaId = this.route.snapshot.queryParams['mesaId'];
    this.numeroMesa = this.route.snapshot.queryParams['num'];
    
    try {
      this.menuItems = await this.orderSvc.getMenuItemsConStock();
    } catch (error) {
      console.error('Error cargando menú:', error);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  public async agregarAlCarrito(item: any) {
    const validacion = await this.orderSvc.validarStockItem(item.id, 1);
    
    if (!validacion.apto) {
      alert(validacion.error);
      return;
    }

    const existe = this.carrito.find(c => c.id === item.id);
    if (existe) {
      existe.cantidad++;
    } else {
      this.carrito.push({ ...item, cantidad: 1 });
    }
    this.actualizarTotal();
  }

  public actualizarTotal() {
    this.total = this.carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
    this.cdr.detectChanges();
  }

  public async confirmarPedido() {
    if (this.carrito.length === 0) return;

    const user = this.auth.getUser();

    // 🛡️ FIX TS18047: Validamos que el usuario exista antes de continuar
    if (!user || !user.id || !user.restauranteId) {
      alert('Error: No se pudo validar la sesión del mesero.');
      return;
    }

    try {
      this.isLoading = true;
      this.cdr.detectChanges();

      // 🟢 Ahora TypeScript sabe que 'user' NO es null aquí
      await this.orderSvc.enviarPedido(
        this.mesaId, 
        this.carrito, 
        user.id,             // Si falla aquí, verifica si en tu interfaz es 'uid'
        user.restauranteId,
        undefined            // reservacionId opcional
      );
      
      alert('Orden enviada a cocina con éxito');
      this.router.navigate(['/waiter/table-map']);
    } catch (error) {
      console.error(error);
      alert('Error al procesar la orden');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // 🟢 Agregamos esta función para el botón "Volver" del HTML que pedía confirmarPedido o navegar
  public volver() {
    this.router.navigate(['/waiter/table-map']);
  }
}