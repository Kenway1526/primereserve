import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config';

@Component({
  selector: 'app-new-reservation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './new-reservation.html',
  styleUrl: './new-reservation.scss'
})
export class NewReservation implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  private supabaseSvc = inject(SupabaseService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID); // 🛡️ Inyectamos el detector de plataforma

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
    ocasion: 'CENA'
  };

  public calendarDays: (Date | null)[] = [];
  public weekDays = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  public currentMonthName = '';
  public timeSlots = ['13:00', '14:00', '15:00', '16:00', '19:00', '20:00', '21:00', '22:00'];

  ngOnInit() {
    this.reservationData.primaryDate.setHours(0,0,0,0);
    this.generateCalendar(new Date());

    // 🛡️ Blindaje crítico: Solo accedemos a localStorage si estamos en el cliente
    if (isPlatformBrowser(this.platformId)) {
      const selectedSlug = localStorage.getItem('active_restaurant_slug');
      if (selectedSlug) {
        this.loadRestaurantData(selectedSlug);
      } else {
        this.isLoading = false; 
      }
    } else {
      // En el servidor (durante el build de Netlify), detenemos el loading de inmediato
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

  // ... (El resto de tus métodos checkAvailability, finish, etc., permanecen igual 
  // ya que son disparados por eventos de usuario que solo ocurren en el navegador)
  
  async checkAvailability() {
    if (!this.reservationData.primaryTime) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const { count: totalMesas } = await this.supabaseSvc.getMesasCount(this.restauranteId);
      
      const d = this.reservationData.primaryDate;
      const dateQuery = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      const { count: ocupadas } = await this.supabaseSvc.getReservacionesOcupadas(
        this.restauranteId, 
        dateQuery, 
        this.reservationData.primaryTime
      );

      const total = totalMesas || 0;
      const resOcupadas = ocupadas || 0;

      this.step = (total > 0 && resOcupadas >= total) ? 5 : 2;

    } catch (error) {
      console.error("Error en disponibilidad:", error);
      this.step = 2;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  public async finish() {
    this.isLoading = true;
    this.generatedFolio = 'PR-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const fechaStr = this.reservationData.primaryDate.toISOString().split('T')[0];
      const horaStr = this.reservationData.primaryTime;

      let mesaIdAsignada = null;
      
      if (this.step === 3) {
        mesaIdAsignada = await this.supabaseSvc.findAvailableTable(
          this.restauranteId, 
          fechaStr, 
          horaStr,
          this.reservationData.guests
        );
      }

      const payload = {
        folio: this.generatedFolio,
        restauranteId: this.restauranteId,
        mesaId: mesaIdAsignada,
        fechaPrincipal: this.reservationData.primaryDate.toISOString(),
        horaPrincipal: horaStr,
        fechaPlanB: this.reservationData.altDate?.toISOString().split('T')[0] || null,
        horaPlanB: this.reservationData.altTime || null,
        numPersonas: this.reservationData.guests,
        ocasion: this.reservationData.ocasion,
        nombreInvitado: this.reservationData.name,
        telefonoInvitado: this.reservationData.phone,
        emailInvitado: this.reservationData.email,
        estado: (this.step === 7 || !mesaIdAsignada) ? 'WAITLIST' : 'PENDIENTE_CONFIRMAR',
        isWaitlistActive: (this.step === 7 || !mesaIdAsignada),
        notasEspeciales: this.reservationData.notes
      };

      const { error } = await this.supabaseSvc.createReservacion(payload);
      if (error) throw error;

      if (mesaIdAsignada) {
        await this.supabaseSvc.updateTableStatus(mesaIdAsignada, 'RESERVADA');
      }
      
      this.step = 4;
    } catch (err) {
      console.error(err);
      if (isPlatformBrowser(this.platformId)) {
        alert('Error al guardar: ' + (err as any).message);
      }
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // Métodos de apoyo (generateCalendar, selectDate, etc) sin cambios.
  public generateCalendar(baseDate: Date) {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    this.currentMonthName = baseDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i); d.setHours(0,0,0,0);
      days.push(d);
    }
    this.calendarDays = days;
  }

  public openDatePicker(target: 'primary' | 'alternative') { this.activeTarget = target; this.showDateModal = true; }
  public openTimePicker(target: 'primary' | 'alternative') { this.activeTarget = target; this.showTimeModal = true; }
  
  public selectDate(d: Date | null) {
    if (!d || d < new Date(new Date().setHours(0,0,0,0))) return;
    if (this.activeTarget === 'primary') this.reservationData.primaryDate = d;
    else this.reservationData.altDate = d;
    this.showDateModal = false;
  }

  public selectTime(t: string) {
    if (this.activeTarget === 'primary') this.reservationData.primaryTime = t;
    else this.reservationData.altTime = t;
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
}