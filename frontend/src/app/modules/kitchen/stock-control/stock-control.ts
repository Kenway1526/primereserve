import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Inventory } from '../../../core/services/inventory/inventory'; // Nomenclatura seca

@Component({
  selector: 'app-stock-control',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stock-control.html',
  styleUrl: './stock-control.scss'
})
export class StockControl implements OnInit {
  ingredients: any[] = [];

  constructor(private inventory: Inventory) {}

  ngOnInit() {
    this.inventory.ingredients$.subscribe(data => this.ingredients = data);
  }

  // Método para agotar o reponer stock rápidamente
  toggleStock(id: string, current: number) {
    const newStock = current > 0 ? 0 : 10; // Ejemplo: agotar o poner 10
    this.inventory.updateIngredientStock(id, newStock);
  }
}