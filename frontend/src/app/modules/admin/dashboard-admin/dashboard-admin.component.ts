import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './dashboard-admin.component.html',
  styleUrl: './dashboard-admin.component.scss'
})
export class DashboardAdminComponent {

  // Inyectamos el Router para gestionar la navegación y el estado de la URL
  constructor(public router: Router) {}

  /**
   * Cierra la sesión administrativa y redirige al usuario al Login 2.
   */
  cerrarSesion(): void {
    console.log("Cerrando sesión de administrador...");
    this.router.navigate(['/login-2']);
  }
}