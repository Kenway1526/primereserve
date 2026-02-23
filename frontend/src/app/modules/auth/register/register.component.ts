import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  constructor(private router: Router) {}

  regresar() {
    // Al navegar a /dashboard, el componente de Registro se destruye
    // y el Dashboard vuelve a mostrar el logo central gracias al *ngIf
    this.router.navigate(['/dashboard']);
  }
}