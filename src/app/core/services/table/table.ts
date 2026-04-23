import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Table {
  id: string;
  number: number;
  capacity: number;
  status: 'available' | 'occupied' | 'dirty' | 'reserved';
}

@Injectable({ providedIn: 'root' })
export class TableService { // Archivo table.ts
  private tables = new BehaviorSubject<Table[]>([
    { id: '1', number: 1, capacity: 4, status: 'available' },
    { id: '2', number: 2, capacity: 2, status: 'occupied' },
    { id: '3', number: 3, capacity: 6, status: 'dirty' },
    { id: '4', number: 4, capacity: 4, status: 'reserved' }
  ]);
  
  tables$ = this.tables.asObservable();

  updateStatus(id: string, newStatus: Table['status']) {
    const current = this.tables.value;
    const table = current.find(t => t.id === id);
    if (table) {
      table.status = newStatus;
      this.tables.next([...current]);
    }
  }
}