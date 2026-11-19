import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; 

export interface Reserva {
  id?: string;
  folio?: string;
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

interface CalendarCell {
  day: number | null;
  dateStr: string;
  disabled: boolean;
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
  private platformId = inject(PLATFORM_ID); 

  public activeTab: 'proximas' | 'curso' | 'espera' | 'canceladas' = 'proximas';
  public isModalOpen = false;
  public isLoading = false;
  public restaurantId = ''; 

  public allReservations: Reserva[] = [];
  public resForm: Reserva = this.initForm();

  // Horarios operativos idénticos al módulo de reservas de comensales
  public readonly allAvailableHours: string[] = [
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'
  ];
  public minDate = '';
  public filteredHours: string[] = [];

  // Estado de los pickers personalizados de Fecha y Hora
  public isDatePickerOpen = false;
  public isTimePickerOpen = false;
  public viewYear = new Date().getFullYear();
  public viewMonth = new Date().getMonth();
  public calendarCells: CalendarCell[] = [];

  private readonly monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  async ngOnInit() {
    this.setMinDate();
    this.buildCalendar();
    if (isPlatformBrowser(this.platformId)) {
      const storedId = APP_CONFIG.RESTAURANT_ID; 
      if (storedId) {
        this.restaurantId = storedId;
        await this.fetchReservations();
      } else {
        console.warn('[Reservations] No se encontró restaurantId');
      }
    }
  }

  private getTodayLocalString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private setMinDate(): void {
    this.minDate = this.getTodayLocalString();
  }

  private initForm(): Reserva {
    const today = this.getTodayLocalString();
    return {
      nombreInvitado: '',
      telefonoInvitado: '',
      emailInvitado: '',
      numPersonas: 2,
      fechaPrincipal: today,
      horaPrincipal: '',
      estado: 'CONFIRMADA',
      isWaitlistActive: false,
      restauranteId: this.restaurantId
    };
  }

  // --- LÓGICA DEL CALENDARIO PERSONALIZADO ---
  public get currentMonthLabel(): string {
    return `${this.monthNames[this.viewMonth]} ${this.viewYear}`;
  }

  public canGoPrevMonth(): boolean {
    const now = new Date();
    return this.viewYear > now.getFullYear() ||
      (this.viewYear === now.getFullYear() && this.viewMonth > now.getMonth());
  }

  public changeMonth(delta: number): void {
    if (delta < 0 && !this.canGoPrevMonth()) return;
    const next = new Date(this.viewYear, this.viewMonth + delta, 1);
    this.viewYear = next.getFullYear();
    this.viewMonth = next.getMonth();
    this.buildCalendar();
  }

  public buildCalendar(): void {
    this.setMinDate();
    const firstDay = new Date(this.viewYear, this.viewMonth, 1);
    // Convertir domingo (0) a índice 6 para que la semana empiece en Lunes (0)
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(this.viewYear, this.viewMonth + 1, 0).getDate();

    const cells: CalendarCell[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dateStr: '', disabled: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const m = String(this.viewMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${this.viewYear}-${m}-${dayStr}`;
      cells.push({
        day: d,
        dateStr,
        disabled: dateStr < this.minDate
      });
    }
    this.calendarCells = cells;
  }

  public toggleDatePicker(): void {
    this.isDatePickerOpen = !this.isDatePickerOpen;
    if (this.isDatePickerOpen) {
      this.isTimePickerOpen = false;
      this.buildCalendar();
    }
  }

  public selectCalendarDate(dateStr: string): void {
    if (!dateStr || dateStr < this.minDate) return;
    this.resForm.fechaPrincipal = dateStr;
    this.isDatePickerOpen = false;
    this.updateAvailableHours();
  }

  public formatDisplayDate(dateStr: string): string {
    if (!dateStr) return 'Selecciona fecha';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  }

  // --- LÓGICA DEL SELECTOR DE HORA PERSONALIZADO ---
  public toggleTimePicker(): void {
    if (this.filteredHours.length === 0) return;
    this.isTimePickerOpen = !this.isTimePickerOpen;
    if (this.isTimePickerOpen) {
      this.isDatePickerOpen = false;
    }
  }

  public selectTimeSlot(hour: string): void {
    this.resForm.horaPrincipal = hour;
    this.isTimePickerOpen = false;
  }

  public closeAllPickers(): void {
    this.isDatePickerOpen = false;
    this.isTimePickerOpen = false;
  }

  public updateAvailableHours(): void {
    this.setMinDate();
    if (this.resForm.fechaPrincipal === this.minDate) {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      this.filteredHours = this.allAvailableHours.filter((hourStr) => {
        const [h, m] = hourStr.split(':').map(Number);
        return (h * 60 + m) > currentMinutes;
      });
    } else {
      this.filteredHours = [...this.allAvailableHours];
    }

    if (this.resForm.horaPrincipal && !this.filteredHours.includes(this.resForm.horaPrincipal)) {
      this.resForm.horaPrincipal = '';
    }
  }

  // --- VALIDACIONES ---
  public isValidName(name: string): boolean {
    return !!name && name.trim().length >= 3;
  }

  public isValidPhone(phone: string): boolean {
    return /^\d{10}$/.test(phone || '');
  }

  public onlyNumbers(event: KeyboardEvent): void {
    if (!/[0-9]/.test(event.key)) {
      event.preventDefault();
    }
  }

  public isFormValid(): boolean {
    this.setMinDate();
    return (
      this.isValidName(this.resForm.nombreInvitado) &&
      this.isValidPhone(this.resForm.telefonoInvitado) &&
      !!this.resForm.fechaPrincipal &&
      this.resForm.fechaPrincipal >= this.minDate &&
      !!this.resForm.horaPrincipal &&
      this.filteredHours.includes(this.resForm.horaPrincipal) &&
      this.resForm.numPersonas >= 1
    );
  }

  // --- CRUD RESERVACIONES ---
  async fetchReservations() {
    if (!this.restaurantId) return; 
    
    this.isLoading = true;
    try {
      const data = await this.supabaseSvc.getReservations(this.restaurantId);
      this.allReservations = data || [];
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
    if (!this.isFormValid() || this.isLoading) return;
    this.isLoading = true;

    try {
      const folioGenerado = `PR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const payload: Reserva = {
        ...this.resForm,
        folio: folioGenerado,
        restauranteId: this.restaurantId,
        nombreInvitado: this.resForm.nombreInvitado.trim(),
        emailInvitado: this.resForm.emailInvitado?.trim() || 'recepcion@primereserve.com'
      };

      if (!payload.isWaitlistActive) {
        const mesaId = await this.supabaseSvc.asignarMesaAutomatica(this.restaurantId, payload.numPersonas);
        
        if (mesaId) {
          payload.mesaId = mesaId;
          payload.estado = 'CONFIRMADA';
          payload.isWaitlistActive = false;
        } else {
          payload.estado = 'WAITLIST';
          payload.isWaitlistActive = true;
          delete payload.mesaId;
        }
      } else {
        payload.estado = 'WAITLIST';
        payload.isWaitlistActive = true;
        delete payload.mesaId;
      }

      const creada = await this.supabaseSvc.createReservation(payload);
      await this.fetchReservations();

      // Cambiar automáticamente a la pestaña donde quedó guardada la reserva
      this.activeTab = (creada?.estado === 'WAITLIST' || creada?.isWaitlistActive)
        ? 'espera'
        : 'proximas';

      if (isPlatformBrowser(this.platformId)) {
        alert(`🎉 ¡Reservación registrada con éxito!\nTitular: ${payload.nombreInvitado}\nFolio: ${creada?.folio || folioGenerado}`);
      }
      
      this.closeModal();
    } catch (err: any) {
      console.error('Error detallado al guardar la reservación:', err);
      if (isPlatformBrowser(this.platformId)) {
        alert(`Error al guardar la reservación: ${err?.message || 'Verifica los datos o permisos'}`);
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
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
    if (!res.id || !res.mesaId) {
      if (isPlatformBrowser(this.platformId)) alert('Esta reserva no tiene una mesa asignada.');
      return;
    }

    this.isLoading = true;
    try {
      await this.supabaseSvc.updateReservationStatus(res.id, 'SENTADO');
      await this.supabaseSvc.updateTableStatus(res.mesaId, 'OCUPADA');
      await this.fetchReservations();
      this.activeTab = 'curso'; 
    } catch (err) {
      console.error('Error al sentar cliente:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  setTab(tab: any) { this.activeTab = tab; this.cdr.detectChanges(); }
  
  openAddModal() { 
    this.setMinDate();
    const now = new Date();
    this.viewYear = now.getFullYear();
    this.viewMonth = now.getMonth();
    this.buildCalendar();
    this.resForm = this.initForm(); 
    this.updateAvailableHours();
    this.closeAllPickers();
    this.isModalOpen = true; 
  }

  closeModal() {
    this.isModalOpen = false;
    this.closeAllPickers();
    this.resForm = this.initForm();
    this.cdr.detectChanges();
  }

  async addToWaitlist() {
    if (!this.isFormValid() || this.isLoading) return;
    this.resForm.estado = 'WAITLIST';
    this.resForm.isWaitlistActive = true;
    await this.saveReservation(); 
  }

  async finalizarReserva(res: Reserva) {
    if (!res.id || !res.mesaId) return;
    
    this.isLoading = true;
    try {
      await this.supabaseSvc.updateReservationStatus(res.id, 'FINALIZADA');
      await this.supabaseSvc.updateTableStatus(res.mesaId, 'SUCIA');
      await this.fetchReservations();
    } catch (err) {
      console.error('Error al finalizar reserva:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}