import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import { Ingredient, MenuItem } from './../../models/inventory.model';

@Injectable({
  providedIn: 'root'
})
export class Inventory {
  // Estado de Insumos
  private ingredientsSubject = new BehaviorSubject<Ingredient[]>([]);
  public ingredients$ = this.ingredientsSubject.asObservable();

  // Estado del Menú
  private menuSubject = new BehaviorSubject<MenuItem[]>([]);
  public menu$ = this.menuSubject.asObservable();

  constructor() {
    // Aquí cargarías los datos iniciales de tu DB (Supabase/API)
  }

  // Actualizar stock de un ingrediente
  updateIngredientStock(ingredientId: string, newStock: number) {
    const currentIngredients = this.ingredientsSubject.value;
    const index = currentIngredients.findIndex(i => i.id === ingredientId);

    if (index !== -1) {
      currentIngredients[index].currentStock = newStock;
      this.ingredientsSubject.next([...currentIngredients]);
      
      // Al cambiar un ingrediente, recalculamos la disponibilidad del menú
      this.refreshMenuAvailability();
    }
  }

  // Lógica CRÍTICA: Verifica si hay stock para cada platillo
  private refreshMenuAvailability() {
    const ingredients = this.ingredientsSubject.value;
    const currentMenu = this.menuSubject.value;

    const updatedMenu = currentMenu.map(item => {
      // Un platillo está disponible solo si TODOS sus ingredientes tienen stock > 0
      const available = item.ingredients.every(ingId => {
        const ingredient = ingredients.find(i => i.id === ingId);
        return ingredient ? ingredient.currentStock > 0 : false;
      });

      return { ...item, isAvailable: available };
    });

    this.menuSubject.next(updatedMenu);
  }

  // Obtener solo platillos disponibles (para la vista del Cliente)
  getAvailableMenu() {
    return this.menu$.pipe(
      map(menu => menu.filter(item => item.isAvailable))
    );
  }
}