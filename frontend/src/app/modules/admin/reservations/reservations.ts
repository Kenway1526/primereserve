import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';

interface Reserva {
  id: number;
  cliente: string;
  personas: number;
  fecha: string;
  hora: string;
  status?: string;
  mesa?: string;
  tel?: string;
  motivo?: string; // Para el historial o cola
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './reservations.html',
  styleUrl: './reservations.css'
})
export class Reservations implements OnInit {
  public activeTab: 'proximas' | 'curso' | 'espera' | 'canceladas' = 'proximas';
  public isModalOpen = false;

  public resForm: Reserva = {
    id: 0, cliente: '', personas: 2, fecha: '', hora: '', mesa: '', tel: ''
  };

  // Listados principales
  public reservations: Reserva[] = [];
  public waitList: Reserva[] = [];
  public cancelledReservations: Reserva[] = [];

  ngOnInit(): void {
    // Ejemplo inicial
    this.reservations.push({ 
      id: 1, cliente: 'Familia García', personas: 4, fecha: '2026-04-15', hora: '20:00', mesa: 'PB-01', status: 'confirmada' 
    });
  }

  setTab(tab: 'proximas' | 'curso' | 'espera' | 'canceladas') { this.activeTab = tab; }

  saveReservation() {
    if (!this.resForm.cliente || !this.resForm.fecha) return;
    const nueva = { ...this.resForm, id: Date.now(), status: 'confirmada' };
    this.reservations.push(nueva);
    this.closeModal();
  }

  addToWaitlist() {
    const nueva = { ...this.resForm, id: Date.now(), motivo: `En cola para ${this.resForm.fecha} ${this.resForm.hora}` };
    this.waitList.push(nueva);
    this.closeModal();
    this.activeTab = 'espera';
  }

  // LÓGICA DE SUCESIÓN: Si se cancela una reserva, se notifica que hay gente en espera
  cancelarReserva(res: Reserva) {
    this.reservations = this.reservations.filter(r => r.id !== res.id);
    this.cancelledReservations.push({ ...res, status: 'cancelada' });
    
    // Verificamos si hay alguien esperando por ese mismo horario
    const sustituto = this.waitList.find(w => w.fecha === res.fecha && w.hora === res.hora);
    if (sustituto) {
      alert(`ESPACIO LIBERADO: El cliente ${sustituto.cliente} está en espera para este horario.`);
    }
  }

  sentarCliente(res: Reserva) {
    res.status = 'en_curso';
    this.activeTab = 'curso';
  }

  promoverSustituto(wait: Reserva) {
    this.waitList = this.waitList.filter(w => w.id !== wait.id);
    this.reservations.push({ ...wait, status: 'confirmada', motivo: 'Promovido de espera' });
    this.activeTab = 'proximas';
  }

  closeModal() {
    this.isModalOpen = false;
    this.resForm = { id: 0, cliente: '', personas: 2, fecha: '', hora: '', mesa: '', tel: '' };
  }

  get filteredReservations(): Reserva[] {
    if (this.activeTab === 'proximas') return this.reservations.filter(r => r.status === 'confirmada');
    if (this.activeTab === 'curso') return this.reservations.filter(r => r.status === 'en_curso');
    if (this.activeTab === 'canceladas') return this.cancelledReservations;
    return [];
  }
}