import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  /*constructor(private router: Router) {}

  regresarAlDashboard() {
    // Regresa al dashboard principal (donde se ve el logo)
    this.router.navigate(['/dashboard']);
  }

  iniciarSesion() {
    // Por ahora, simulamos el envío al dashboard secundario
    // Primero deberás crear el componente 'dashboard-secundario'
    console.log("Iniciando sesión...");
    // this.router.navigate(['/dashboard-secundario']); 
  }*/
}