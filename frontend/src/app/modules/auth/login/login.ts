import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth, UserRole } from '../../../core/services/auth/auth';
import { SupabaseService } from '../../../core/services/supabase'; // Importante

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
  private supabaseSvc = inject(SupabaseService); // Inyectamos Supabase

  public mode: 'staff' | 'client' = 'client';
  public isLoading = false;
  public errorMessage = '';
  public restaurantName = 'PRIME RESERVE';

  // Modelos
  public user = '';
  public password = '';
  public clientAccess = { folio: '', phone: '' };

  ngOnInit() {
    const resData = localStorage.getItem('active_restaurant');
    if (resData) {
      this.restaurantName = JSON.parse(resData).name;
    }
  }

  // --- ACCESO STAFF (Sigue siendo simulación por ahora) ---
  public handleLogin(): void {
    if (!this.user || !this.password) {
      this.errorMessage = 'Ingrese sus credenciales de personal.';
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    setTimeout(() => {
      try {
        let role: UserRole = 'WAITER';
        if (this.user.toLowerCase().includes('admin')) role = 'ADMIN';
        else if (this.user.toLowerCase().includes('cocina')) role = 'KITCHEN';

        this.auth.login(role, this.user);

        const redirectMap: Record<UserRole, string> = {
          'ADMIN': '/admin/dashboard',
          'WAITER': '/mesero/mapa',
          'KITCHEN': '/kitchen/orders',
          'CLIENTE': '/client/dashboard/dashboard'
        };

        this.router.navigate([redirectMap[role]]);
      } catch (err) {
        this.errorMessage = 'Error de autenticación. Intente de nuevo.';
      } finally {
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    }, 1500);
  }

  public async onClientAccess(): Promise<void> {
    if (!this.clientAccess.folio || !this.clientAccess.phone) {
      this.errorMessage = 'El folio y el teléfono son necesarios.';
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    console.log('%c [Login] Validando acceso cliente...', 'color: #d4af37; font-weight: bold;');

    try {
      // 1. Validar en Supabase (llamada a tu método de servicio)
      const { data, error } = await this.supabaseSvc.validarAccesoCliente(
        this.clientAccess.folio, 
        this.clientAccess.phone
      );

      if (error || !data) {
        console.error('[Login] Credenciales inválidas:', error);
        this.errorMessage = 'Acceso denegado. Verifique su folio y teléfono.';
        return;
      }

      console.log('%c [Login] Datos encontrados:', 'color: #28a745;', data);

      // 2. Persistencia de datos de la reserva para el Dashboard
      localStorage.setItem('client_reserva_id', data.id);
      localStorage.setItem('client_folio', data.folio);

      // 3. Login en el servicio Auth
      // Importante: Esto actualiza el BehaviorSubject que el RoleGuard consulta vía getRole()
      this.auth.login('CLIENTE', data.folio);

      console.log('%c [Login] Auth Service actualizado. Navegando...', 'color: #3498db;');

      // 4. Navegación con Buffer de tiempo
      // Usamos 200ms para dar tiempo a que los observables del Auth Service emitan el nuevo valor
      setTimeout(() => {
        this.router.navigate(['/client/dashboard'], { replaceUrl: true }).then(nav => {
          if (nav) {
            console.log('%c [Login] Navegación exitosa al Dashboard', 'color: #28a745');
          } else {
            console.error('%c [Login] Angular rechazó la ruta final', 'color: #ff4d4d');
          }
        });
      }, 150);

    } catch (err) {
      console.error('[Login] Error fatal:', err);
      this.errorMessage = 'Error de conexión con el servidor.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}