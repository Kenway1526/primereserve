import { Component, contentChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterPipe } from '../../../shared/pipes/filter-pipe';
import { Modal } from '../../../shared/components/modal/modal';

@Component({
  selector: 'app-staff-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterPipe, Modal],
  templateUrl: './staff-mgmt.html',
  styleUrl: './staff-mgmt.scss'
})
export class StaffMgmt {
  public searchText: string = '';
  public isModalOpen = false;
  public modalTitle: string = '';

  public memberForm: any = {id: '',nombre: '', rol: '', email: '', telefono: '', img: '', activo: true};
  
  // Datos locales blindados (mapeados a tu tabla 'usuarios')
  public staff = [
    { id: '1', nombre: 'Carlos Ruiz', rol: 'MESERO', email: 'carlos@prime.com', activo: true },
    { id: '2', nombre: 'Ana López', rol: 'COCINA', email: 'ana@prime.com', activo: true },
    { id: '3', nombre: 'Roberto Mtz', rol: 'MESERO', email: 'roberto@prime.com', activo: false },
    { id: '4', nombre: 'Chef Herrera', rol: 'ADMIN', email: 'admin@prime.com', activo: true }
  ];

  public stats = {
    total: 6,
    activos: 5,
    meseros: 3,
    cocina: 2,
    inactivos: 1
  };

  ngOnInit(): void { this.calculateStats(); }

  calculateStats() {
    this.stats.total = this.staff.length;
    this.stats.activos = this.staff.filter(s => s.activo).length;
    this.stats.meseros = this.staff.filter(s => s.rol === 'Mesero').length;
    this.stats.cocina = this.staff.filter(s => s.rol === 'Cocina').length;
    this.stats.inactivos = this.staff.filter(s => !s.activo).length;
  }

  openAddModal() {
    this.modalTitle = 'Nuevo Empleado';
    this.memberForm = { id: '', nombre: '', rol: 'Mesero', email: '', telefono: '', activo: true, img: `https://i.pravatar.cc/150?u=${Date.now()}` };
    this.isModalOpen = true;
  }

  openEditModal(member: any) {
    this.modalTitle = 'Editar Empleado';
    this.memberForm = { ...member }; // Copia para no editar el original antes de guardar
    this.isModalOpen = true;
  }

  saveMember() {
    if (this.memberForm.id) {
      // Editar empleado existente
      const index = this.staff.findIndex(s => s.id === this.memberForm.id);
      if (index !== -1) {
        this.staff[index] = { ...this.memberForm };
      }
    } else {
      // Agregar nuevo empleado (Simulando creación de ID)
      this.memberForm.id = Date.now().toString();
      this.staff.push({ ...this.memberForm });
    }
    this.calculateStats(); // Recalcular métricas
    this.isModalOpen = false;
  }

  toggleStatus(member: any) {
    member.activo = !member.activo;
  }
}