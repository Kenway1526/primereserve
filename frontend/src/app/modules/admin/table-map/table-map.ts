import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';

@Component({
  selector: 'app-table-map',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal],
  templateUrl: './table-map.html',
  styleUrl: './table-map.scss'
})
export class TableMap implements OnInit {
  public isModalOpen = false;
  public selectedTable: any = null;
  public currentFloor = 'PB';

  public allTables = [
    { id: 1, num: '01', cap: 2, estado: 'LIBRE', x: 120, y: 150, floor: 'PB', forma: 'circular' },
    { id: 2, num: '02', cap: 4, estado: 'OCUPADA', x: 300, y: 150, floor: 'PB', forma: 'cuadrada' },
    { id: 3, num: 'T1', cap: 4, estado: 'RESERVADA', x: 200, y: 200, floor: 'TERRAZA', forma: 'circular' },
    { id: 4, num: '03', cap: 6, estado: 'SUCIA', x: 500, y: 150, floor: 'PB', forma: 'cuadrada' },
  ];

  get filteredTables() {
    return this.allTables.filter(t => t.floor === this.currentFloor);
  }

  ngOnInit(): void {}

  onDragEnd(event: DragEvent, table: any) {
    const floor = document.querySelector('.restaurant-floor') as HTMLElement;
    if (floor) {
      const rect = floor.getBoundingClientRect();
      table.x = event.clientX - rect.left - 40;
      table.y = event.clientY - rect.top - 40;
    }
  }

  openAddModal() {
    // Calculamos el siguiente número basado solo en el piso actual
    const tablesInFloor = this.allTables.filter(t => t.floor === this.currentFloor);
    const nextNum = tablesInFloor.length + 1;
    
    // Generamos el prefijo automático: PB para Planta Baja, T para Terraza
    const prefix = this.currentFloor === 'PB' ? 'PB' : 'T';
    
    this.selectedTable = { 
      id: Date.now(), 
      num: `${prefix}-${nextNum}`, // Generación automática
      cap: 2, 
      estado: 'LIBRE', 
      x: 50, 
      y: 50, 
      floor: this.currentFloor,
      forma: 'cuadrada',
      isNew: true // Bandera para saber si bloqueamos el input
    };
    this.isModalOpen = true;
  }

  openEditModal(table: any) {
    this.selectedTable = { ...table, isNew: false }; // No bloqueamos el input al editar
    this.isModalOpen = true;
  }

  saveTable() {
    const index = this.allTables.findIndex(t => t.id === this.selectedTable.id);
    if (index !== -1) this.allTables[index] = { ...this.selectedTable };
    else this.allTables.push({ ...this.selectedTable });
    this.isModalOpen = false;
  }
}