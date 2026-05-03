import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Auth } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit, OnDestroy {
  private auth = inject(Auth);
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private authSub?: Subscription;

  public reserva: any = null;
  public isLoading = true;

  ngOnInit() {
    console.log('🚀 [Dashboard] Iniciado');
    
    this.authSub = this.auth.user$.subscribe(user => {
      console.log('👤 [Dashboard] Usuario detectado:', user);
      
      if (user?.reservaId) {
        this.fetchReserva(user.reservaId);
      } else {
        console.warn('⚠️ [Dashboard] No hay reservaId. Cancelando carga.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });

    // Seguridad: Si en 5 segundos no carga nada, quitamos el spinner
    setTimeout(() => {
      if (this.isLoading) {
        console.error('⏳ [Dashboard] Tiempo de espera agotado');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 5000);
  }

  private async fetchReserva(id: string) {
    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('Reservacion')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      this.reserva = data;
      console.log('✅ [Dashboard] Datos de reserva cargados:', data);
    } catch (err) {
      console.error('❌ [Dashboard] Error en fetch:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  ngOnDestroy() {
    this.authSub?.unsubscribe();
  }
}