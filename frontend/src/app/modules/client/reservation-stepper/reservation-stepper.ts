import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Reservation } from '../../../core/models/reservation.model';

@Component({
  selector: 'app-reservation-stepper',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservation-stepper.html',
  styleUrl: './reservation-stepper.scss'
})
export class ReservationStepper {
  step = 1;
  res: Reservation = {
    primaryDate: '', primaryTime: '',
    alternativeDate: '', alternativeTime: '',
    people: 2, occasion: '', requests: '', status: 'Pending'
  };

  next() { if (this.step < 4) this.step++; }
  prev() { if (this.step > 1) this.step--; }
  
  confirm() {
    console.log('Reserva enviada:', this.res);
    // Aquí llamarías a tu servicio de reserva
  }
}