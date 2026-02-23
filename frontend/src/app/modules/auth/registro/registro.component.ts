import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-registro',
  standalone: true,
  // Importamos CommonModule para directivas como *ngIf y FormsModule para el manejo de formularios
  imports: [CommonModule, FormsModule],
  templateUrl: './registro.component.html',
  styleUrl: './registro.component.scss'
})
export class RegistroComponent {

  constructor(private router: Router) {}

  /**
   * Limpia el formulario y regresa a la vista principal del Dashboard 2.
   * Al navegar a '/dashboard-2', el componente de registro se destruye
   * y vuelve a aparecer el logo central gracias a la lógica del padre.
   */
  regresar(): void {
    // Por ahora solo implementamos la navegación de retorno sin guardar
    console.log("Regresando al dashboard principal...");
    this.router.navigate(['/dashboard-2']);
  }

  /**
   * En el futuro, aquí implementarás la lógica para guardar los datos 
   * del restaurante (nombre de la empresa, correo, etc.)
   */
  crearCuenta(): void {
    // Paso 1: Validar información
    // Paso 2: Guardar en base de datos
    // Paso 3: Redirigir al Inicio de Sesión 2 según el diagrama
    console.log("Simulando creación de cuenta...");
    this.router.navigate(['/login-2']);
  }
}