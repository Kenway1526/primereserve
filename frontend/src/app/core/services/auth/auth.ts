import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

// 🟢 Mantenemos tus roles
export type UserRole = 'ADMIN' | 'WAITER' | 'KITCHEN' | 'CLIENTE' | 'COCINA' | 'MESERO' | null;

export interface UserData {
  id: string; // Obligatorio para Supabase
  identifier: string;
  role: UserRole;
  token: string;
  restauranteId: string | null;
  reservaId?: string; 
}

@Injectable({ providedIn: 'root' })
export class Auth {
  private platformId = inject(PLATFORM_ID);
  private userSubject = new BehaviorSubject<UserData | null>(null);
  public user$ = this.userSubject.asObservable();

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage();
    }
  }

  private loadUserFromStorage(): void {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        this.userSubject.next(JSON.parse(savedUser));
      }
    } catch (e) {
      this.logout();
    }
  }

  // 🟢 AGREGAMOS userId como parámetro. Para CLIENTE puede ser el mismo reservaId si no hay otro.
  public login(role: UserRole, identifier: string, restauranteId: string | null, reservaId?: string, userId?: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear(); 
    }

    const userData: UserData = {
      // 🟢 Si no viene userId (como en cliente), usamos reservaId o el identifier como fallback para que nunca sea null
      id: userId || reservaId || identifier, 
      role: role ? role.toUpperCase() as UserRole : null,
      identifier,
      restauranteId,
      reservaId: role?.toUpperCase() === 'CLIENTE' ? reservaId : undefined,
      token: 'prime-jwt-' + Math.random().toString(36).substring(2)
    };
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
    
    this.userSubject.next(userData);
  }

  public logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.clear();
    }
    this.userSubject.next(null);
  }

  public getUser(): UserData | null {
    return this.userSubject.value;
  }

  public getRole(): UserRole | null {
    return this.userSubject.value?.role || null;
  }

  public isAuthenticated(): boolean {
    return this.userSubject.value !== null;
  }
}