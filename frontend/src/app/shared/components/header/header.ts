import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from '../../../core/services/auth/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  public auth = inject(Auth);
  private router = inject(Router);

  // Datos extraídos del observable del servicio Auth
  // user$ contiene: { identifier, role, token }
  
  public logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }

  // Helper para saber si mostrar el menú de staff
  get isStaff(): boolean {
    const role = this.auth.getRole();
    return role !== 'CLIENTE' && role !== null;
  }
}