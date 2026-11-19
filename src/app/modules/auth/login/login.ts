import { Component, inject, OnInit, ChangeDetectorRef, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth, UserRole } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config';  

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit {
  private auth = inject(Auth);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private supabaseSvc = inject(SupabaseService);
  private platformId = inject(PLATFORM_ID);

  public mode: 'staff' | 'client' = 'client'; 
  public isLoading = false;
  public errorMessage = '';
  public restaurantName = APP_CONFIG.RESTAURANT_NAME;

  public userEmail = '';
  public password = '';
  public clientAccess = { folio: '', phone: '' };

  ngOnInit() {
    if (isPlatformBrowser(this.platformId) && !this.auth.isAuthenticated()) {
      this.auth.logout(); 
      sessionStorage.clear(); // Limpieza absoluta de contingencia
    }
  }

  /**
   * ACCESO STAFF TRANSACCIONAL DIRECTO 🛡️
   */
  public async handleLogin(): Promise<void> {
    if (!this.userEmail || !this.password) {
      this.errorMessage = 'Credenciales obligatorias.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const roleMap: Record<string, UserRole> = {
      'ADMIN': 'ADMIN',
      'COCINA': 'KITCHEN',
      'KITCHEN': 'KITCHEN',
      'MESERO': 'MESERO'
    };

    try {
      // Realizamos la validación directa en la tabla pública de control operativo
      const { data: publicUser, error: publicErr } = await this.supabaseSvc.supabase
        .from('Usuario')
        .select('*')
        .eq('email', this.userEmail.toLowerCase().trim())
        .eq('password', this.password)
        .single();

      if (publicErr || !publicUser) {
        throw new Error('Credenciales incorrectas o usuario inexistente.');
      }

      const normalizedRole = roleMap[publicUser.rol.toUpperCase()] || null;
      if (!normalizedRole) throw new Error('Rol operativo no parametrizado.');

      // 🔑 LA JUGADA CLAVE: Almacenamos el perfil completo en la sesión local del navegador
      if (isPlatformBrowser(this.platformId)) {
        sessionStorage.setItem('current_user', JSON.stringify(publicUser));
      }

      // Iniciamos sesión en tu servicio compartido Auth
      this.auth.login(normalizedRole, publicUser.nombre, APP_CONFIG.RESTAURANT_ID, undefined, publicUser.id);
      this.redirectByUserRole();

    } catch (err: any) {
      this.errorMessage = err.message || 'Error de autenticación operativo.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * ACCESO CLIENTE
   */
  public async onClientAccess(): Promise<void> {
    const folio = this.clientAccess.folio.trim();
    const phone = this.clientAccess.phone.trim();

    if (!folio || !phone) {
      this.errorMessage = 'Folio y teléfono requeridos.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const { data: reserva, error } = await this.supabaseSvc.supabase
        .from('Reservacion')
        .select('*')
        .eq('folio', folio)
        .eq('telefonoInvitado', phone) 
        .single();

      if (error || !reserva) throw new Error('Acceso denegado. Verifique sus datos.');

      this.auth.login('CLIENTE', reserva.folio, APP_CONFIG.RESTAURANT_ID, reserva.id);
      this.router.navigate(['/client/dashboard'], { replaceUrl: true });

    } catch (err: any) {
      this.errorMessage = err.message;
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  private redirectByUserRole() {
    const role = this.auth.getRole();
    const redirectMap: Record<string, string> = {
      'ADMIN': '/admin',
      'KITCHEN': '/kitchen/order-monitor',
      'MESERO': '/waiter/table-map',
      'CLIENTE': '/client/dashboard'
    };

    if (role && redirectMap[role]) {
      this.router.navigate([redirectMap[role]], { replaceUrl: true });
    }
  }

  public setMode(newMode: 'staff' | 'client') {
    this.mode = newMode;
    this.errorMessage = '';
    this.auth.logout(); 
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.clear();
    }
    this.cdr.detectChanges();
  }
}