import { Component, inject, ChangeDetectorRef, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';
import { APP_CONFIG } from '../../../core/constants/config'; 
import { FilterPipe } from '../../../shared/pipes/filter-pipe'; 

export enum RolUsuario {
  ADMIN = 'ADMIN',
  MESERO = 'MESERO',
  COCINA = 'COCINA'
}

@Component({
  selector: 'app-staff-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, Modal, FilterPipe],
  templateUrl: './staff-mgmt.html',
  styleUrl: './staff-mgmt.scss'
})
export class StaffMgmt implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public searchText: string = '';
  public isModalOpen = false;
  public isLoading = false;
  public modalTitle: string = '';
  
  // 🛡️ Almacena el ID del usuario administrador que inició sesión
  public currentUserId: string | null = null;
  
  public credentialsGenerated: { email: string; pass: string } | null = null;

  public memberForm: any = { 
    id: '', 
    nombre: '', 
    rol: RolUsuario.MESERO, 
    email: '', 
    password: '', 
    telefono: '', 
    restauranteId: APP_CONFIG.RESTAURANT_ID,
    avatarUrl: ''
  };
  
  public staff: any[] = [];
  public selectedFile: File | null = null;
  public imagePreview: string | null = null;
  public stats = { total: 0, activos: 0, meseros: 0, cocina: 0, admin: 0 };

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      await this.getCurrentUser();
      await this.loadStaff();
    }
  }

  // 🛡️ Obtener el ID del usuario con la sesión activa
  async getCurrentUser() {
    try {
      const { data: { user } } = await this.supabaseSvc.supabase.auth.getUser();
      if (user) {
        this.currentUserId = user.id;
      } else {
        // En caso de que se use un campo id personalizado en la tabla 'Usuario' guardado en localStorage/session
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          this.currentUserId = parsed.id || null;
        }
      }
    } catch (err) {
      console.error('Error al obtener usuario actual:', err);
    }
  }

  async loadStaff() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('Usuario')
        .select('*')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) 
        .neq('rol', 'CLIENTE') 
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      this.staff = data || [];
      this.calculateStats();
    } catch (err) {
      console.error('❌ Error cargando la lista de personal:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  calculateStats() {
    this.stats.total = this.staff.length;
    this.stats.meseros = this.staff.filter(s => s.rol === RolUsuario.MESERO).length;
    this.stats.cocina = this.staff.filter(s => s.rol === RolUsuario.COCINA).length;
    this.stats.admin = this.staff.filter(s => s.rol === RolUsuario.ADMIN).length;
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadImage(file: File): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await this.supabaseSvc.supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (error) throw error;
      return this.supabaseSvc.supabase.storage.from('avatars').getPublicUrl(fileName).data.publicUrl;
    } catch (err) {
      console.error('❌ Fallo al subir el avatar:', err);
      return null;
    }
  }

  async saveMember() {
    if (!this.memberForm.nombre || !this.memberForm.email || (!this.memberForm.id && !this.memberForm.password) || this.isLoading) return;
    this.isLoading = true;
    this.credentialsGenerated = null;
    this.cdr.detectChanges();

    try {
      let finalAvatarUrl = this.memberForm.avatarUrl;

      if (this.selectedFile) {
        const uploadedUrl = await this.uploadImage(this.selectedFile);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }

      const payload: any = {
        nombre: this.memberForm.nombre,
        rol: this.memberForm.rol,
        email: this.memberForm.email.toLowerCase().trim(),
        telefono: this.memberForm.telefono || null,
        restauranteId: APP_CONFIG.RESTAURANT_ID,
        avatarUrl: finalAvatarUrl
      };

      if (this.memberForm.id) {
        const { error } = await this.supabaseSvc.supabase
          .from('Usuario')
          .update(payload)
          .eq('id', this.memberForm.id);
        
        if (error) throw error;
        await this.loadStaff();
        this.closeModal();
      } else {
        const passwordAsignada = this.memberForm.password;
        
        payload.id = crypto.randomUUID();
        payload.password = passwordAsignada;
        payload.fechaCreacion = new Date().toISOString();

        const { error: profileError } = await this.supabaseSvc.supabase
          .from('Usuario')
          .insert([payload]);

        if (profileError) throw profileError;
        
        this.isLoading = false; 
        
        this.credentialsGenerated = {
          email: payload.email,
          pass: passwordAsignada
        };
        
        await this.loadStaff();
        this.cdr.detectChanges();
      }
    } catch (err: any) {
      console.error('💥 Excepción en persistencia:', err);
      this.isLoading = false;
      alert(`No se pudo procesar: ${err.message || 'Error de base de datos'}`);
      this.cdr.detectChanges();
    }
  }

  // 🛡️ MÉTODO DE ELIMINACIÓN CON VALIDACIÓN DE AUTO-BORRADO
  async deleteMember(id: string) {
    if (!isPlatformBrowser(this.platformId)) return;

    // Bloqueo explícito en TypeScript si se intenta borrar a sí mismo
    if (this.currentUserId && id === this.currentUserId) {
      alert('⚠️ Acción Denegada: No puedes eliminar tu propio usuario de administrador con sesión activa.');
      return;
    }

    if (!confirm('¿Deseas dar de baja a este miembro?')) return;

    try {
      this.isLoading = true;
      const { error } = await this.supabaseSvc.supabase.from('Usuario').delete().eq('id', id);
      if (error) throw error;
      await this.loadStaff();
    } catch (err: any) { 
      console.error('Error al eliminar:', err); 
      alert('Error al eliminar usuario: ' + (err.message || 'No se pudo completar la operación'));
    } finally { 
      this.isLoading = false; 
      this.cdr.detectChanges(); 
    }
  }

  openAddModal() {
    this.modalTitle = 'REGISTRAR EMPLEADO';
    this.memberForm = { id: '', nombre: '', rol: RolUsuario.MESERO, email: '', password: '', telefono: '', restauranteId: APP_CONFIG.RESTAURANT_ID, avatarUrl: '' };
    this.imagePreview = null;
    this.credentialsGenerated = null;
    this.isModalOpen = true;
  }

  openEditModal(member: any) {
    this.modalTitle = 'EDITAR PERFIL';
    this.memberForm = { ...member, password: '' }; 
    this.imagePreview = member.avatarUrl;
    this.credentialsGenerated = null;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.credentialsGenerated = null;
    this.imagePreview = null;
    this.cdr.detectChanges();
  }
}