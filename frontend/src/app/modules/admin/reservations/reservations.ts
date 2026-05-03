import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; // 👈 Tu constante res_001

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
  private platformId = inject(PLATFORM_ID); // 🛡️ Detector de plataforma

  public activeTab: 'proximas' | 'curso' | 'espera' | 'canceladas' = 'proximas';
  public isModalOpen = false;
  public isLoading = false;
  public restaurantId = ''; // 👈 Iniciar vacío para seguridad

  public allReservations: Reserva[] = [];
  public resForm: Reserva = this.initForm();

  async ngOnInit() {
    // 🛡️ Solo ejecutamos si estamos en el Navegador
    if (isPlatformBrowser(this.platformId)) {
      const storedId = APP_CONFIG.RESTAURANT_ID; // Usamos tu constante directamente
      if (storedId) {
        this.restaurantId = storedId;
        await this.fetchReservations();
      } else {
        console.warn('[Reservations] No se encontró restaurantId en Storage');
      }
    }
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
    if (!this.restaurantId) return; // Seguridad extra
    
    this.isLoading = true;
    try {
      const data = await this.supabaseSvc.getReservations(this.restaurantId);
      this.allReservations = data || [];
      console.log('✅ Reservas sincronizadas');
    } catch (err) {
      console.error('Error al obtener reservas:', err);
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
      // Usar el ID actual del componente
      this.resForm.restauranteId = this.restaurantId;

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
      if (isPlatformBrowser(this.platformId)) alert('Error al guardar');
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async cambiarEstado(res: Reserva, nuevoEstado: Reserva['estado']) {
    if (!res.id) return;
    try {
      await this.supabaseSvc.updateReservationStatus(res.id, nuevoEstado);
      // Lógica de liberación de mesa
      if ((nuevoEstado === 'CANCELADA' || nuevoEstado === 'FINALIZADA') && res.mesaId) {
        await this.supabaseSvc.updateTableStatus(res.mesaId, 'LIBRE');
      }
      await this.fetchReservations();
    } catch (err) {
      console.error(err);
    }
  }

  async sentarCliente(res: Reserva) {
    if (!res.id || !res.mesaId) {
      if (isPlatformBrowser(this.platformId)) alert('Esta reserva no tiene una mesa asignada.');
      return;
    }

    this.isLoading = true;
    try {
      await this.supabaseSvc.updateReservationStatus(res.id, 'SENTADO');
      await this.supabaseSvc.updateTableStatus(res.mesaId, 'OCUPADA');
      await this.fetchReservations();
      this.activeTab = 'curso'; // 🏎️ Salto automático a la pestaña activa
    } catch (err) {
      console.error('Error al sentar cliente:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  setTab(tab: any) { this.activeTab = tab; this.cdr.detectChanges(); }
  
  openAddModal() { 
    this.resForm = this.initForm(); // Reiniciamos con el restaurantId cargado
    this.isModalOpen = true; 
  }

  closeModal() {
    this.isModalOpen = false;
    this.resForm = this.initForm();
    this.cdr.detectChanges();
  }

  // --- Método para añadir a lista de espera desde el modal ---
  async addToWaitlist() {
    this.resForm.estado = 'WAITLIST';
    this.resForm.isWaitlistActive = true;
    await this.saveReservation(); // Reutiliza la lógica de guardado
  }

  // --- Método para finalizar el servicio (libera la mesa) ---
  async finalizarReserva(res: Reserva) {
    if (!res.id || !res.mesaId) return;
    
    this.isLoading = true;
    try {
      // 1. Cambiamos estado de la reserva a FINALIZADA
      await this.supabaseSvc.updateReservationStatus(res.id, 'FINALIZADA');
      
      // 2. Liberamos la mesa para que aparezca disponible en el mapa
      await this.supabaseSvc.updateTableStatus(res.mesaId, 'SUCIA');
      
      // 3. Refrescamos la lista
      await this.fetchReservations();
      
      console.log('Servicio finalizado y mesa liberada.');
    } catch (err) {
      console.error('Error al finalizar reserva:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}