import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

export type UserRole = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CLIENTE';

interface UserData {
  identifier: string;
  role: UserRole;
  token: string;
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private platformId = inject(PLATFORM_ID);
  
  private userSubject = new BehaviorSubject<UserData | null>(null);
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

  public login(role: UserRole, identifier: string): void {
    const userData: UserData = {
      role,
      token: 'prime-jwt-' + Math.random().toString(36).substring(2),
      identifier
    };
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    this.userSubject.next(userData);
  }

  public logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('user');
    }
    this.userSubject.next(null);
  }

  // Métodos de verificación para los Guards
  public isAuthenticated(): boolean {
    return !!this.userSubject.value;
  }

  public getRole(): UserRole | null {
    return this.userSubject.value?.role || null;
  }
}