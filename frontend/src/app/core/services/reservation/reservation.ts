import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Reservation } from '../../models/reservation.model';

@Injectable({
  providedIn: 'root'
})
export class ReservationService { // Mantenemos el nombre de la clase interno pero el archivo es 'reservation.ts'
  private reservationsSubject = new BehaviorSubject<Reservation[]>([]);
  public reservations$ = this.reservationsSubject.asObservable();

  constructor() {}

  // Crear reservación con lógica de Plan B
  createReservation(data: Reservation) {
    const current = this.reservationsSubject.value;
    // Lógica: Si no hay disponibilidad en primaryDate, marcar como 'Waitlist'
    const newReservation = {
      ...data,
      id: Math.random().toString(36).substr(2, 9),
      status: data.status || 'Confirmed',
      createdAt: new Date()
    };
    
    this.reservationsSubject.next([...current, newReservation]);
    return newReservation;
  }

  getWaitlist() {
    return this.reservationsSubject.value.filter(r => r.status === 'Waitlist');
  }
}