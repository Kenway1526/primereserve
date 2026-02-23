import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-cliente',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './dashboard-cliente.component.html',
  styleUrl: './dashboard-cliente.component.scss'
})
export class DashboardClienteComponent {

  constructor(public router: Router) {}

  /**
   * Cierra la sesión del cliente y lo devuelve al Login 2
   * según el flujo del diagrama de vistas.
   */
  cerrarSesion(): void {
    console.log("Cerrando sesión de cliente...");
    this.router.navigate(['/dashboard-2']);
  }
}