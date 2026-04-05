import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { FilterPipe } from '../../../shared/pipes/filter-pipe';

@Component({
  selector: 'app-inventory-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, FilterPipe],
  templateUrl: './inventory-mgmt.html',
  styleUrl: './inventory-mgmt.scss'
})
export class InventoryMgmt implements OnInit {
  public isModalOpen = false;
  public searchText = '';
  public itemForm: any = { id: '', nombre: '', stock: 0, min: 0, unidad: 'PZ', categoria: 'Insumos' };

  public ingredients = [
    { id: '1', nombre: 'Ribeye Prime', stock: 12, min: 15, unidad: 'KG', categoria: 'Carnes' },
    { id: '2', nombre: 'Vino Tinto Reserva', stock: 45, min: 20, unidad: 'PZ', categoria: 'Vinos' },
    { id: '3', nombre: 'Salmón Atlántico', stock: 5, min: 10, unidad: 'KG', categoria: 'Pescados' },
    { id: '4', nombre: 'Harina de Trigo', stock: 100, min: 50, unidad: 'KG', categoria: 'Insumos' },
  ];

  public stats = { totalItems: 0, lowStock: 0 };

  ngOnInit(): void { this.updateStats(); }

  updateStats() {
    this.stats.totalItems = this.ingredients.length;
    this.stats.lowStock = this.ingredients.filter(i => i.stock < i.min).length;
  }

  openAddModal() {
    this.itemForm = { id: '', nombre: '', stock: 0, min: 10, unidad: 'PZ', categoria: 'Insumos' };
    this.isModalOpen = true;
  }

  openEditModal(item: any) {
    this.itemForm = { ...item };
    this.isModalOpen = true;
  }

  saveItem() {
    if (this.itemForm.id) {
      const idx = this.ingredients.findIndex(i => i.id === this.itemForm.id);
      this.ingredients[idx] = { ...this.itemForm };
    } else {
      this.itemForm.id = Date.now().toString();
      this.ingredients.push({ ...this.itemForm });
    }
    this.updateStats();
    this.isModalOpen = false;
  }
}