import { Component } from '@angular/core';

@Component({
  selector: 'app-billing',
  standalone: true,
  templateUrl: './billing.html'
})
export class Billing {
  order = {
    items: [
      { id: 'p1', name: 'Corte Ribeye', price: 850, paid: false },
      { id: 'p2', name: 'Vino Tinto', price: 1200, paid: false }
    ],
    total: 2050
  };

  selectedItems: any[] = [];

  // Lógica para cobrar solo lo seleccionado
  processPartialPayment() {
    const subtotal = this.selectedItems.reduce((acc, item) => acc + item.price, 0);
    console.log(`Procesando pago parcial de: $${subtotal}`);
    // Marcar items como pagados y actualizar saldo de la mesa
  }
}