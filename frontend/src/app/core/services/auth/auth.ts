import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Auth {
  private platformId = inject(PLATFORM_ID);
  
  // El BehaviorSubject mantiene el estado del usuario en memoria
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();

  constructor() {
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          this.userSubject.next(JSON.parse(savedUser));
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    }
  }

  public login(role: 'ADMIN' | 'CLIENTE', email: string): void {
    const userData = { email, role, token: 'fake-jwt-' + Math.random() };
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    this.userSubject.next(userData);
  }

  /**
   * MÉTODO LOGOUT: Limpia el estado y el storage de forma segura
   */
  public logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('user');
    }
    // Notificamos a todos los componentes (como el Header) que el usuario es null
    this.userSubject.next(null);
  }

  public getRole(): string | null {
    return this.userSubject.value?.role || null;
  }
}