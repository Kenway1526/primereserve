import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-waiter-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class WaiterDashboard implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  public restaurantName = 'PRIME RESERVE';
  public filterStatus: 'TODOS' | 'ESPERA' | 'SENTADO' = 'TODOS';

  // Simulamos la "BD" de reservaciones que el mesero debe gestionar
  public reservations = [
    { folio: 'PR-X9J2', customer: 'JUAN PÉREZ', time: '20:00', guests: 2, status: 'ESPERA', phone: '5512345678' },
    { folio: 'PR-WAIT77', customer: 'CARLOS SLIM', time: '20:15', guests: 4, status: 'ESPERA', phone: '5587654321' },
    { folio: 'RES-A8K2', customer: 'MARÍA FÉLIX', time: '19:30', guests: 2, status: 'SENTADO', phone: '5544332211' }
  ];

  ngOnInit() {
    // Aquí cargarías las reservas reales desde un servicio
  }

  // Acción: Cambiar de Lista de Espera a Mesa Asignada
  public seatCustomer(index: number) {
    this.reservations[index].status = 'SENTADO';
    this.cdr.detectChanges();
    // TIP: Aquí dispararías la notificación push que le llega al Dashboard del Cliente
  }

  public get filteredReservations() {
    if (this.filterStatus === 'TODOS') return this.reservations;
    return this.reservations.filter(r => r.status === this.filterStatus);
  }

  public removeRes(index: number) {
    this.reservations.splice(index, 1);
  }
}