import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config';
import { ReplacePipe } from '../../../shared/pipes/replace.pipe';
import { registerLocaleData } from '@angular/common'
import localeEsMX from '@angular/common/locales/es-MX';

registerLocaleData(localeEsMX, 'es-MX');

@Component({
  selector: 'app-new-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ReplacePipe],
  templateUrl: './new-reservation.html',
  styleUrl: './new-reservation.scss'
})
export class NewReservation implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private supabaseSvc = inject(SupabaseService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  public step = 1; 
  public isLoading = false;
  public restaurante: any = null;
  public restauranteId = APP_CONFIG.RESTAURANT_ID; 
  
  public showDateModal = false;
  public showTimeModal = false;
  public activeTarget: 'primary' | 'alternative' = 'primary';
  public generatedFolio = '';

  public reservationData = {
    primaryDate: new Date(),
    primaryTime: '',
    altDate: null as Date | null,
    altTime: '',
    guests: 2,
    name: '',
    phone: '',
    email: '',
    notes: '',
    ocasion: 'CENA',
    zona: 'PLANTA_BAJA'
  };

  public calendarDays: (Date | null)[] = [];
  public weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  public currentMonthName = '';
  public currentCalendarDate = new Date(); // 📅 Control de navegación de mes
  public timeSlots = ['13:00', '14:00', '15:00', '16:00', '19:00', '20:00', '21:00', '22:00'];

  ngOnInit() {
    this.reservationData.primaryDate.setHours(0,0,0,0);
    this.currentCalendarDate = new Date(this.reservationData.primaryDate);
    this.generateCalendar(this.currentCalendarDate);

    if (isPlatformBrowser(this.platformId)) {
      const selectedSlug = localStorage.getItem('active_restaurant_slug');
      if (selectedSlug) {
        this.loadRestaurantData(selectedSlug);
      } else {
        this.isLoading = false; 
      }
    } else {
      this.isLoading = false;
    }
  }

  async loadRestaurantData(slug: string) {
    this.isLoading = true;
    try {
      const { data } = await this.supabaseSvc.getRestauranteBySlug(slug);
      if (data) { 
        this.restaurante = data; 
        this.restauranteId = data.id; 
      }
    } catch (err) {
      console.error("Error cargando restaurante:", err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
  
  async checkAvailability() {
    if (!this.reservationData.primaryTime) return;
    
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const d = this.reservationData.primaryDate;
      const dateQuery = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const mesaId = await this.supabaseSvc.findAvailableTable(
        this.restauranteId,
        dateQuery,
        this.reservationData.primaryTime,
        this.reservationData.zona,
        this.reservationData.guests
      );

      if (mesaId) {
        this.step = 2;
      } else {
        this.step = 5;
      }

    } catch (error) {
      console.error("Error al verificar disponibilidad:", error);
      this.step = 2; 
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  public isValidEmail(email: string): boolean {
    if(!email) return false;
    const emailRegex = /^[a-zA-Z0-9._+]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  public isValidPhone(phone: string): boolean {
    if(!phone) return false;
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone.trim());
  }

  public isStep2Valid(): boolean {
    return (
      this.isValidName(this.reservationData.name) &&
      this.isValidPhone(this.reservationData.phone) &&
      this.isValidEmail(this.reservationData.email)
    );
  }

  public isPastTime(timeSlot: string): boolean {
    const targetDate = this.activeTarget === 'primary' 
      ? this.reservationData.primaryDate 
      : this.reservationData.altDate;

    if (!targetDate) return false;

    const hoy = new Date();
    
    // Solo aplicamos el filtro si la fecha elegida es HOY
    const esHoy = targetDate.getFullYear() === hoy.getFullYear() &&
                  targetDate.getMonth() === hoy.getMonth() &&
                  targetDate.getDate() === hoy.getDate();

    if (!esHoy) {
      return false; // Si es para un día futuro, todas las horas son válidas
    }

    // Parsear la hora seleccionada (ejemplo: "14:00")
    const [horas, minutos] = timeSlot.split(':').map(Number);
    
    const horaSlotDate = new Date(targetDate);
    horaSlotDate.setHours(horas, minutos, 0, 0);

    // Retorna true si la hora del slot es menor o igual a la hora actual
    return horaSlotDate <= hoy;
  }

  public async finish() {
    this.isLoading = true;
    this.cdr.detectChanges();
    
    this.generatedFolio = 'PR-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const fechaStr = this.reservationData.primaryDate.toISOString().split('T')[0];
      const horaStr = this.reservationData.primaryTime;

      let tieneAforoDisponible = false;
      
      if (this.step !== 7) { 
        const mesaIdDisponible = await this.supabaseSvc.findAvailableTable(
          this.restauranteId, 
          fechaStr, 
          horaStr,
          this.reservationData.zona,
          this.reservationData.guests
        );
        tieneAforoDisponible = !!mesaIdDisponible;
      }

      const payload = {
        folio: this.generatedFolio,
        restauranteId: this.restauranteId,
        mesaId: null, 
        zona: this.reservationData.zona,
        fechaPrincipal: this.reservationData.primaryDate.toISOString(),
        horaPrincipal: horaStr,
        fechaPlanB: this.reservationData.altDate ? this.reservationData.altDate.toISOString() : null,
        horaPlanB: this.reservationData.altTime || null,
        numPersonas: this.reservationData.guests,
        ocasion: this.reservationData.ocasion,
        nombreInvitado: this.reservationData.name,
        telefonoInvitado: this.reservationData.phone,
        emailInvitado: this.reservationData.email,
        notasEspeciales: this.reservationData.notes,
        estado: (!tieneAforoDisponible) ? 'WAITLIST' : 'PENDIENTE_CONFIRMAR',
        isWaitlistActive: (!tieneAforoDisponible)
      };

      const { error } = await this.supabaseSvc.createReservacion(payload);
      if (error) throw error;

      this.step = 4;

    } catch (err) {
      console.error('❌ Error crítico al finalizar reserva:', err);
      if (isPlatformBrowser(this.platformId)) {
        alert('No pudimos procesar tu reserva: ' + (err as any).message);
      }
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }

  // 📅 GENERACIÓN DINÁMICA DE CALENDARIO Y NAVEGACIÓN
  public generateCalendar(baseDate: Date) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    this.currentMonthName = baseDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i); 
      d.setHours(0,0,0,0);
      days.push(d);
    }
    this.calendarDays = days;
  }

  // ⏩ Siguiente mes
  public nextMonth() {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
    this.generateCalendar(this.currentCalendarDate);
  }

  // ⏪ Mes anterior (bloqueado si es antes del mes actual)
  public prevMonth() {
    const hoy = new Date();
    hoy.setHours(0,0,0,0);
    const primerDiaMesActual = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    
    const fechaIntento = new Date(this.currentCalendarDate);
    fechaIntento.setMonth(fechaIntento.getMonth() - 1);

    if (fechaIntento >= primerDiaMesActual) {
      this.currentCalendarDate = fechaIntento;
      this.generateCalendar(this.currentCalendarDate);
    }
  }

  public openDatePicker(target: 'primary' | 'alternative') { 
    this.activeTarget = target; 
    this.currentCalendarDate = new Date();
    this.generateCalendar(this.currentCalendarDate);
    this.showDateModal = true; 
  }
  
  public openTimePicker(target: 'primary' | 'alternative') { 
    this.activeTarget = target; 
    this.showTimeModal = true; 
  }
  
  public selectDate(d: Date | null, event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    // 🛡️ Bloqueo estricto de selección en días pasados
    if (!d || this.isPastDate(d)) return;
    
    const nuevaFecha = new Date(d);
    if (this.activeTarget === 'primary') {
      this.reservationData.primaryDate = nuevaFecha;
    } else {
      this.reservationData.altDate = nuevaFecha;
    }

    this.showDateModal = false;
    this.cdr.detectChanges();
  }

  // 🛡️ Verificador de día pasado
  public isPastDate(d: Date | null): boolean {
    if (!d) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return d < hoy;
  }

  public selectTime(t: string) {
    if (this.isPastTime(t)) return; // Bloquea el clic si la hora ya pasó

    if (this.activeTarget === 'primary') {
      this.reservationData.primaryTime = t;
    } else {
      this.reservationData.altTime = t;
    }
    
    this.showTimeModal = false;
  }

  public isSelected(d: Date | null): boolean {
    if (!d) return false;
    const targetDate = this.activeTarget === 'primary' ? this.reservationData.primaryDate : this.reservationData.altDate;
    return targetDate ? d.getTime() === targetDate.getTime() : false;
  }

  public updateGuests(mod: number) {
    const next = this.reservationData.guests + mod;
    if (next >= 1 && next <= 10) this.reservationData.guests = next;
  }

  onlyNumbers(event: any) {
    const pattern = /[0-9]/;
    const inputChar = String.fromCharCode(event.charCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }

  isValidName(name: string): boolean {
    if (!name) return false;
    return name.trim().length >= 3;
  }
}