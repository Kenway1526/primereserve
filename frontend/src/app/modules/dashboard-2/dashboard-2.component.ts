import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-2',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './dashboard-2.component.html',
  styleUrl: './dashboard-2.component.scss'
})
export class Dashboard2Component {
  
  // Inyectamos el Router para rastrear la navegación
  constructor(public router: Router) {}

  /**
   * Verifica si el usuario está en la raíz del Dashboard 2.
   * Esto sirve para ocultar el logo y botones cuando se carga el Registro.
   */
  esRutaRaiz(): boolean {
    return this.router.url === '/dashboard-2';
  }
}