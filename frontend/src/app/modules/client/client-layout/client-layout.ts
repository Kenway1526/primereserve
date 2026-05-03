import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../../core/services/auth/auth';

@Component({
  selector: 'app-client-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './client-layout.html',
  styleUrl: './client-layout.scss'
})
export class ClientLayout {
  private auth = inject(Auth);

  public logout() {
    this.auth.logout();
    window.location.href = '/auth/login';
  }
}