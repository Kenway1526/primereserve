import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';

export interface Reserva {
  id?: string;
  nombreInvitado: string;
  telefonoInvitado: string;
  emailInvitado: string;
  numPersonas: number;
  fechaPrincipal: string;
  horaPrincipal: string;
  estado: 'WAITLIST' | 'CONFIRMADA' | 'SENTADO' | 'FINALIZADA' | 'CANCELADA';
  isWaitlistActive: boolean;
  restauranteId: string;
  mesaId?: string;
  Mesa?: {
    numeroMesa: number;
    zona: 'PLANTA_BAJA' | 'TERRAZA';
  };
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})
export class Reservations implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  public activeTab: 'proximas' | 'curso' | 'espera' | 'canceladas' = 'proximas';
  public isModalOpen = false;
  public isLoading = false;
  public restaurantId = localStorage.getItem('active_restaurant_id') || '';

  public allReservations: Reserva[] = [];
  public resForm: Reserva = this.initForm();

  async ngOnInit() {
    if (this.restaurantId) await this.fetchReservations();
  }

  private initForm(): Reserva {
    return {
      nombreInvitado: '',
      telefonoInvitado: '',
      emailInvitado: '',
      numPersonas: 2,
      fechaPrincipal: '',
      horaPrincipal: '',
      estado: 'CONFIRMADA',
      isWaitlistActive: false,
      restauranteId: this.restaurantId
    };
  }

  async fetchReservations() {
    this.isLoading = true;
    try {
      const data = await this.supabaseSvc.getReservations(this.restaurantId);
      this.allReservations = data || [];
    } catch (err) {
      console.error('Error:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  get filteredReservations(): Reserva[] {
    switch (this.activeTab) {
      case 'proximas': 
        return this.allReservations.filter(r => r.estado === 'CONFIRMADA');
      case 'curso': 
        // Ahora filtramos por SENTADO para que aparezcan aquí las tarjetas
        return this.allReservations.filter(r => r.estado === 'SENTADO'); 
      case 'espera': 
        return this.allReservations.filter(r => r.estado === 'WAITLIST' || r.isWaitlistActive);
      case 'canceladas': 
        return this.allReservations.filter(r => r.estado === 'CANCELADA');
      default: 
        return [];
    }
  }

  async saveReservation() {
    if (!this.resForm.nombreInvitado || !this.resForm.fechaPrincipal || this.isLoading) return;
    this.isLoading = true;

    try {
      const mesaId = await this.supabaseSvc.asignarMesaAutomatica(this.restaurantId, this.resForm.numPersonas);
      
      if (mesaId) {
        this.resForm.mesaId = mesaId;
        this.resForm.estado = 'CONFIRMADA';
      } else {
        this.resForm.estado = 'WAITLIST';
        this.resForm.isWaitlistActive = true;
      }

      await this.supabaseSvc.createReservation(this.resForm);
      await this.fetchReservations();
      this.closeModal();
    } catch (err) {
      alert('Error al guardar');
    } finally {
      this.isLoading = false;
    }
  }

  async addToWaitlist() {
    this.resForm.estado = 'WAITLIST';
    this.resForm.isWaitlistActive = true;
    await this.saveReservation();
  }

  async cambiarEstado(res: Reserva, nuevoEstado: Reserva['estado']) {
    if (!res.id) return;
    try {
      await this.supabaseSvc.updateReservationStatus(res.id, nuevoEstado);
      if ((nuevoEstado === 'CANCELADA' || nuevoEstado === 'FINALIZADA') && res.mesaId) {
        await this.supabaseSvc.updateTableStatus(res.mesaId, 'LIBRE');
      }
      await this.fetchReservations();
    } catch (err) {
      console.error(err);
    }
  }

  async sentarCliente(res: Reserva) {
    if (!res.id) return;
    
    if (!res.mesaId) {
      alert('Esta reserva no tiene una mesa asignada.');
      return;
    }

    this.isLoading = true;
    try {
      // 1. Actualizamos el estado de la RESERVACIÓN a 'SENTADO' (Valor real de tu Enum)
      await this.supabaseSvc.updateReservationStatus(res.id, 'SENTADO');

      // 2. Actualizamos el estado de la MESA a 'OCUPADA'
      await this.supabaseSvc.updateTableStatus(res.mesaId, 'OCUPADA');

      // 3. Refrescamos la lista para obtener los datos actualizados
      await this.fetchReservations();
      
      // 4. CAMBIO DE PESTAÑA: Movemos la vista a "En Curso" automáticamente
      this.activeTab = 'curso';
      
      console.log(`Cliente ${res.nombreInvitado} sentado con éxito.`);
    } catch (err) {
      console.error('Error al sentar cliente:', err);
      alert('Error al sentar al cliente. Verifica la conexión.');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Para el botón de finalizar (si lo tienes)
  async finalizarReserva(res: Reserva) {
    if (!res.id || !res.mesaId) return;
    
    this.isLoading = true;
    try {
      // Estado RESERVA -> COMPLETADA
      await this.supabaseSvc.updateReservationStatus(res.id, 'COMPLETADA');
      // Estado MESA -> SUCIA (para que el staff sepa que hay que limpiar)
      await this.supabaseSvc.updateTableStatus(res.mesaId, 'SUCIA');
      
      await this.fetchReservations();
    } catch (err) {
      console.error(err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  setTab(tab: any) { this.activeTab = tab; this.cdr.detectChanges(); }
  openAddModal() { this.isModalOpen = true; }
  closeModal() {
    this.isModalOpen = false;
    this.resForm = this.initForm();
    this.cdr.detectChanges();
  }
}