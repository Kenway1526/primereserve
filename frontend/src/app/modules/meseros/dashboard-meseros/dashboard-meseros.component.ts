import { Component } from '@angular/core';
import { Router, RouterOutlet, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-meseros',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './dashboard-meseros.component.html',
  styleUrl: './dashboard-meseros.component.scss'
})
export class DashboardMeserosComponent {

  constructor(public router: Router) {}

  /**
   * Finaliza la sesión del personal de servicio y vuelve al inicio de sesión 2.
   */
  cerrarSesion(): void {
    console.log("Sesión de meseros finalizada.");
    this.router.navigate(['/login-2']);
  }
}