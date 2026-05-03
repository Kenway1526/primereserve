import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-menu-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './menu-view.html',
  styleUrl: './menu-view.scss'
})
export class MenuView implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  public platillos: any[] = [];
  public platillosFiltrados: any[] = [];
  public categorias: string[] = [];
  public categoriaSeleccionada: string = 'Todos';
  public isLoading = true;

  async ngOnInit() {
    console.log('🍽️ Cargando MenuItem...');
    await this.getMenu();
  }

  public async getMenu() {
    this.isLoading = true;
    this.cdr.detectChanges(); // Asegura que el spinner se vea

    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('MenuItem') // 👈 Tu tabla según image_26d186.png
        .select('*')
        .eq('estaDisponible', true); // 👈 Tu columna según image_26d186.png

      if (error) throw error;

      this.platillos = data || [];
      this.platillosFiltrados = this.platillos;
      
      // Extraer categorías únicas
      const uniqueCats = [...new Set(this.platillos.map(p => p.categoria))];
      this.categorias = ['Todos', ...uniqueCats];
      
      console.log('✅ Datos cargados:', this.platillos.length);
    } catch (err) {
      console.error('❌ Error en Supabase:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges(); // 🚀 ¡ESTO QUITA EL SPINNER!
    }
  }

  public filtrarPorCategoria(cat: string) {
    this.categoriaSeleccionada = cat;
    this.platillosFiltrados = cat === 'Todos' 
      ? this.platillos 
      : this.platillos.filter(p => p.categoria === cat);
    this.cdr.detectChanges();
  }
}