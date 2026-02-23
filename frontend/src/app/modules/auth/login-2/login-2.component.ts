import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-2',
  standalone: true,
  // Importamos CommonModule para directivas básicas y FormsModule si decides usar ngModel después
  imports: [CommonModule, FormsModule],
  templateUrl: './login-2.component.html',
  styleUrl: './login-2.component.scss'
})
export class Login2Component {

  constructor(private router: Router) {}

  /**
   * Maneja el acceso al sistema redirigiendo al usuario 
   * según el rol seleccionado en el formulario.
   * @param rol El valor proveniente del elemento <select>
   */
  acceder(rol: string): void {
    if (!rol) {
      alert('Por favor, selecciona un rol de acceso.');
      return;
    }

    console.log(`Iniciando sesión como: ${rol}`);

    // Lógica de redirección basada en tu diagrama de vistas
    switch (rol) {
      case 'cliente':
        this.router.navigate(['/cliente']);
        break;
      case 'admin':
        this.router.navigate(['/admin']);
        break;
      case 'mesero':
        this.router.navigate(['/meseros']);
        break;
      case 'cocina':
        this.router.navigate(['/cocina']);
        break;
      default:
        // En caso de error o rol no reconocido, vuelve al dashboard principal
        this.router.navigate(['/dashboard-2']);
        break;
    }
  }

  /**
   * Función para el botón "Volver" que regresa a la raíz pública
   */
  regresarAlInicio(): void {
    this.router.navigate(['/dashboard-2']);
  }
}