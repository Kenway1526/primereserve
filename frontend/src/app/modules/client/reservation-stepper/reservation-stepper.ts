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
  
}