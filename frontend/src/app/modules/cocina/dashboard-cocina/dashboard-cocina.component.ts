import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-cocina',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './dashboard-cocina.component.html',
  styleUrl: './dashboard-cocina.component.scss'
})
export class DashboardCocinaComponent {

  constructor(public router: Router) {}

  /**
   * Cierra la sesión del área de cocina para retornar al login de roles.
   */
  cerrarSesion(): void {
    console.log("Saliendo del panel de cocina...");
    this.router.navigate(['/login-2']);
  }
}