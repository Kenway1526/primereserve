import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inventory } from '../../../core/services/inventory/inventory';

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './order-entry.html'
})
export class OrderEntry {
  menu$ = this.inventory.getAvailableMenu(); // Solo muestra lo disponible
  currentOrder: any[] = [];

  constructor(private inventory: Inventory) {}

  addToOrder(item: any) {
    // Aquí se van acumulando los items antes de enviar a cocina
    this.currentOrder.push({ ...item, orderTime: new Date() });
  }

  get total() {
    return this.currentOrder.reduce((acc, item) => acc + item.price, 0);
  }
}