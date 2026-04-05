import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  // Inyección moderna de Angular
  private auth = inject(Auth);
  private router = inject(Router);

  public credentials = {
    email: '',
    password: ''
  };

  public isLoading = false;
  public errorMessage = '';

  public onLogin(): void {
    if (!this.credentials.email || !this.credentials.password) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Simulamos la validación (En el futuro aquí va la llamada a Supabase)
    setTimeout(() => {
      try {
        // Lógica de detección de roles para desarrollo
        const isAdmin = this.credentials.email.includes('admin');
        const role = isAdmin ? 'ADMIN' : 'CLIENTE';

        // Usamos el nuevo método login del servicio Auth
        this.auth.login(role as any, this.credentials.email);

        // Redirección inmediata según el rol
        if (role === 'ADMIN') {
          this.router.navigate(['/admin/dashboard']);
        } else {
          this.router.navigate(['/client/dashboard']);
        }

      } catch (error) {
        this.errorMessage = 'Error al iniciar sesión. Intenta de nuevo.';
      } finally {
        this.isLoading = false;
      }
    }, 1000);
  }
}