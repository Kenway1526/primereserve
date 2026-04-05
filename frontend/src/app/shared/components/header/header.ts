import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  private auth = inject(Auth);
  private router = inject(Router);
  
  public userEmail: string = '';

  constructor() {
    // Escuchamos los cambios del usuario. 
    // Cuando el servicio haga logout, user$ emitirá null.
    this.auth.user$.subscribe(user => {
      this.userEmail = user?.email || 'Invitado';
    });
  }

  public onLogout(): void {
    this.auth.logout(); // Llama al método que acabamos de crear
    this.router.navigate(['/home/login']);
  }
}