import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router'; // Importante incluir RouterLink
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-restaurant-catalog',
  standalone: true,
  imports: [CommonModule, RouterLink], // Asegúrate de que esté aquí
  templateUrl: './restaurant-catalog.html',
  styleUrl: './restaurant-catalog.scss'
})
export class RestaurantCatalog implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  public restaurantes: any[] = [];
  public isLoading = true;

  async ngOnInit() {
    await this.fetchRealData();
  }

  async fetchRealData() {
    this.isLoading = true;
    // Intentamos obtener datos de la BD
    try {
        // La petición se va al servidor, pero el hilo principal de Angular sigue libre
        const data = await this.supabaseSvc.getRestaurantes();
        this.restaurantes = data || [];
      } catch (error) {
        console.error('Error de carga:', error);
      } finally {
        this.isLoading = false;
        // FORZAMOS EL PINTADO: Le decimos a Angular que los datos llegaron "de golpe"
        this.cdr.detectChanges();
      }
  }

  // MÉTODO PARA RESERVAR
  selectRestaurant(restaurant: any) { // Recibe el objeto 'res' completo del *ngFor
      if (restaurant && restaurant.id) {
        console.log('Sincronizando Restaurante:', restaurant.nombre);
        
        // Guardamos AMBOS para que el Admin y la Reserva funcionen
        localStorage.setItem('active_restaurant_slug', restaurant.slug);
        localStorage.setItem('active_restaurant_id', restaurant.id); // Aquí guardamos el UUID real
        
        this.router.navigate(['/reservar']).then(nav => {
          if(nav) {
            console.log('Navegación exitosa con ID:', restaurant.id);
          } else {
            console.error('Error de navegación: Verifica rutas.');
          }
        });
      } else {
        console.error('El restaurante seleccionado no tiene un ID válido en Supabase.');
      }
  }
}