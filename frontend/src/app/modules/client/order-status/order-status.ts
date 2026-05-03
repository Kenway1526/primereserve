import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-order-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-status.html',
  styleUrl: './order-status.scss'
})
export class OrderStatus implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private authSub?: Subscription;

  public items: any[] = [];
  public isLoading = true;

  async ngOnInit() {
    this.authSub = this.auth.user$.subscribe(user => {
      if (user?.reservaId) {
        this.fetchDetalleOrden(user.reservaId);
      } else {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  public async fetchDetalleOrden(reservaId: string) {
    try {
      // 1. Buscamos la Orden vinculada a esta reservación
      const { data: orden, error: ordenError } = await this.supabaseSvc.supabase
        .from('Orden')
        .select('id')
        .eq('reservacionId', reservaId)
        .eq('estado', 'ABIERTA') // Solo órdenes actuales
        .maybeSingle();

      if (ordenError) throw ordenError;

      if (orden) {
        // 2. Buscamos los platillos en DetalleOrden usando el ordenId
        const { data: detalles, error: detalleError } = await this.supabaseSvc.supabase
          .from('DetalleOrden')
          .select(`
            id,
            cantidad,
            estadoItem,
            menuItemId,
            MenuItem (
              nombre,
              imagenUrl
            )
          `)
          .eq('ordenId', orden.id);

        if (detalleError) throw detalleError;
        this.items = detalles || [];
      }
    } catch (err) {
      console.error('❌ Error cargando DetalleOrden:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  public getIcon(estado: string): string {
    const icons: Record<string, string> = {
      'PENDIENTE': 'schedule',
      'EN_PREPARACION': 'restaurant',
      'LISTO': 'check_circle',
      'ENTREGADO': 'local_dining'
    };
    return icons[estado] || 'help_outline';
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}