import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase'; // Ajusta la ruta

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

  public step = 1; 
  public isLoading = false;
  public restaurante: any = null;
  public restauranteId = ''; 
  
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
    // 1. Inicialización inmediata de valores locales (Síncrono)
    this.reservationData.primaryDate.setHours(0,0,0,0);
    this.generateCalendar(new Date());

    // 2. Disparar carga de datos sin bloquear el renderizado
    const selectedSlug = localStorage.getItem('active_restaurant_slug');
    if (selectedSlug) {
      this.loadRestaurantData(selectedSlug);
    } else {
      this.isLoading = false; // Si no hay slug, dejamos de cargar
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

      // Si no hay mesas disponibles, mandamos a lista de espera (Step 5 o el que manejes)
      this.step = (total > 0 && resOcupadas >= total) ? 5 : 2;

    } catch (error) {
      console.error("Error en disponibilidad:", error);
      this.step = 2; // Fail-safe: dejamos que intente reservar
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
      
      // --- LÓGICA DE ASIGNACIÓN DE MESA ---
      // Si el usuario viene del flujo normal (no waitlist)
      if (this.step === 3) {
        // 1. Buscamos la mesa disponible en el servicio
        mesaIdAsignada = await this.supabaseSvc.findAvailableTable(
          this.restauranteId, 
          fechaStr, 
          horaStr,//PR-QBJMCE
          this.reservationData.guests // <-- Pasamos el número de comensales
        );
      }

      const payload = {
        folio: this.generatedFolio,
        restauranteId: this.restauranteId,
        mesaId: mesaIdAsignada, // <--- ASIGNAMOS EL ID AQUÍ
        fechaPrincipal: fechaStr,
        horaPrincipal: horaStr,
        fechaPlanB: this.reservationData.altDate?.toISOString().split('T')[0] || null,
        horaPlanB: this.reservationData.altTime || null,
        numPersonas: this.reservationData.guests,
        ocasion: this.reservationData.ocasion,
        nombreInvitado: this.reservationData.name,
        telefonoInvitado: this.reservationData.phone,
        emailInvitado: this.reservationData.email,
        // Si no encontró mesa en step 3, lo mandamos a WAITLIST automáticamente
        estado: (this.step === 7 || !mesaIdAsignada) ? 'WAITLIST' : 'CONFIRMADA',
        isWaitlistActive: (this.step === 7 || !mesaIdAsignada),
        notasEspeciales: this.reservationData.notes
      };

      // 3. Si se asignó mesa, la marcamos como RESERVADA en la DB
      const { data: newRes, error } = await this.supabaseSvc.createReservacion(payload);
      if (error) throw error;

      // --- NUEVO: Actualizar estado de la mesa si fue asignada ---
      if (mesaIdAsignada) {
        await this.supabaseSvc.updateTableStatus(mesaIdAsignada, 'RESERVADA');
      }
      
      this.step = 4; // Pantalla de éxito
    } catch (err) {
      console.error(err);
      alert('Error al guardar: ' + (err as any).message);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  // MÉTODOS DE APOYO (Mantienen tu lógica original)
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
      event.preventDefault(); // Bloquea la tecla si no es número
    }
  }
}