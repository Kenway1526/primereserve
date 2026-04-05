export interface Ingredient {
  id: string;
  name: string;
  currentStock: number;
  unit: 'kg' | 'gr' | 'lt' | 'ml' | 'pcs';
  minStockAlert: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  ingredients: string[]; // IDs de los ingredientes que consume
  isAvailable: boolean; // Se vuelve false si algún ingrediente llega a 0
}