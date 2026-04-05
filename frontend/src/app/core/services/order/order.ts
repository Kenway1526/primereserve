import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Order {
  private activeOrdersSubject = new BehaviorSubject<any[]>([]);
  
  // Agregar productos a una mesa (Acumulable)
  addToOrder(tableId: string, items: any[]) {
    const orders = this.activeOrdersSubject.value;
    const tableOrderIndex = orders.findIndex(o => o.tableId === tableId);

    if (tableOrderIndex > -1) {
      // Si la mesa ya tiene orden, sumamos los nuevos items
      orders[tableOrderIndex].items = [...orders[tableOrderIndex].items, ...items];
      orders[tableOrderIndex].total += items.reduce((acc, curr) => acc + curr.price, 0);
    } else {
      // Si es primera orden, la creamos
      orders.push({
        tableId,
        items,
        total: items.reduce((acc, curr) => acc + curr.price, 0),
        status: 'pending'
      });
    }
    this.activeOrdersSubject.next([...orders]);
  }

  getOrderDetails(tableId: string) {
    return this.activeOrdersSubject.value.find(o => o.tableId === tableId);
  }
}