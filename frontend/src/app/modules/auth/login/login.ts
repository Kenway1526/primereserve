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

  // El modo inicial es CLIENTE, pero no dispara lógica hasta que el usuario actúe
  public mode: 'staff' | 'client' = 'client'; 
  public isLoading = false;
  public errorMessage = '';
  public restaurantName = APP_CONFIG.RESTAURANT_NAME;

  public userEmail = '';
  public password = '';
  public clientAccess = { folio: '', phone: '' };

  ngOnInit() {
    // 🛡️ Al entrar al Login, si hay algo raro en el storage, lo limpiamos
    // para que "Gestionar" no herede basura de "Mi Mesa"
    if (isPlatformBrowser(this.platformId) && !this.auth.isAuthenticated()) {
      this.auth.logout(); 
    }
  }

  /**
   * ACCESO STAFF
   */
  public async handleLogin(): Promise<void> {
    if (!this.userEmail || !this.password) {
      this.errorMessage = 'Credenciales obligatorias.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    try {
      const { data: authData, error: authError } = await this.supabaseSvc.supabase.auth.signInWithPassword({
        email: this.userEmail,
        password: this.password
      });

      if (authError || !authData.user) throw new Error('Credenciales incorrectas.');

      const { data: profile, error: profileError } = await this.supabaseSvc.supabase
        .from('Usuario')
        .select('rol, nombre')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) throw new Error('Perfil no encontrado.');

      const roleMap: Record<string, UserRole> = {
        'ADMIN': 'ADMIN',
        'COCINA': 'KITCHEN',
        'KITCHEN': 'KITCHEN',
        'MESERO': 'MESERO'
      };

      const normalizedRole = roleMap[profile.rol.toUpperCase()] || null;
      if (!normalizedRole) throw new Error('Rol no autorizado.');

      // Login y Redirección Limpia
      this.auth.login(normalizedRole, profile.nombre, APP_CONFIG.RESTAURANT_ID, undefined, authData.user.id ); 
      this.redirectByUserRole();

    } catch (err: any) {
      this.errorMessage = err.message || 'Error de autenticación.';
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
        .eq('telefonoInvitado', phone) // 👈 Campo verificado en tu captura de Supabase
        .single();

      if (error || !reserva) throw new Error('Acceso denegado. Verifique sus datos.');

      // Login Cliente
      console.log('🔑 Login: Datos válidos. Guardando sesión...');
      this.auth.login('CLIENTE', reserva.folio, APP_CONFIG.RESTAURANT_ID, reserva.id);
      console.log('🏃 Login: Intentando navegar a /client/dashboard');
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
      'ADMIN': '/admin/dashboard',
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
    this.auth.logout(); // 🛡️ Limpiamos al cambiar de pestaña
    this.cdr.detectChanges();
  }
}