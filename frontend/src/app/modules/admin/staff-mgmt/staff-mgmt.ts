import { Component, OnInit, inject, ChangeDetectorRef, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterPipe } from '../../../shared/pipes/filter-pipe';
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';
import { Auth } from '../../../core/services/auth/auth'; 
import { APP_CONFIG } from '../../../core/constants/config'; // 🚀 La fuente de la verdad

@Component({
  selector: 'app-staff-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterPipe, Modal],
  templateUrl: './staff-mgmt.html',
  styleUrl: './staff-mgmt.scss'
})
export class StaffMgmt implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private auth = inject(Auth); 
  private cdr = inject(ChangeDetectorRef);
  private platformId = inject(PLATFORM_ID);

  public searchText: string = '';
  public isModalOpen = false;
  public isLoading = false;
  public modalTitle: string = '';
  
  // 🚀 Usamos directamente la constante para evitar esperas asíncronas
  public restaurantId: string = APP_CONFIG.RESTAURANT_ID;

  public memberForm: any = { 
    id: '', 
    nombre: '', 
    rol: 'MESERO', 
    email: '', 
    telefono: '', 
    restauranteId: APP_CONFIG.RESTAURANT_ID,
    avatarUrl: ''
  };
  
  public staff: any[] = [];
  public selectedFile: File | null = null;
  public imagePreview: string | null = null;
  public stats = { total: 0, activos: 0, meseros: 0, cocina: 0, admin: 0, inactivos: 0 };

  async ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // Cargamos el personal inmediatamente usando el ID estático
      await this.loadStaff();
    }
  }

  async loadStaff() {
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      const { data, error } = await this.supabaseSvc.supabase
        .from('Usuario')
        .select('*')
        .eq('restauranteId', APP_CONFIG.RESTAURANT_ID) // 👈 Filtrado Sincronizado
        .neq('rol', 'CLIENTE')
        .order('nombre', { ascending: true });
      
      if (error) throw error;
      
      this.staff = data || [];
      this.calculateStats();
      
    } catch (err) {
      console.error('Error al cargar personal:', err);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  calculateStats() {
    this.stats.total = this.staff.length;
    this.stats.meseros = this.staff.filter(s => s.rol === 'MESERO' || s.rol === 'WAITER').length;
    this.stats.cocina = this.staff.filter(s => s.rol === 'COCINA' || s.rol === 'KITCHEN').length;
    this.stats.admin = this.staff.filter(s => s.rol === 'ADMIN').length;
    this.stats.activos = this.staff.length; 
    this.stats.inactivos = 0; 
  }

  // --- MÉTODOS DE IMAGEN ---
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
      console.error('Upload error:', err);
      return null;
    }
  }

  // --- CRUD ---
  async saveMember() {
    const idParaGuardar = APP_CONFIG.RESTAURANT_ID;

    if (!this.memberForm.nombre || !this.memberForm.email || this.isLoading) return;
    this.isLoading = true;
    this.cdr.detectChanges();

    try {
      let finalAvatarUrl = this.memberForm.avatarUrl;

      if (this.selectedFile) {
        const uploadedUrl = await this.uploadImage(this.selectedFile);
        if (uploadedUrl) finalAvatarUrl = uploadedUrl;
      }

      const payload = {
        nombre: this.memberForm.nombre,
        rol: this.memberForm.rol,
        email: this.memberForm.email,
        telefono: this.memberForm.telefono,
        restauranteId: idParaGuardar,
        avatarUrl: finalAvatarUrl
      };

      if (this.memberForm.id) {
        // ACTUALIZAR
        const { error } = await this.supabaseSvc.supabase
          .from('Usuario')
          .update(payload)
          .eq('id', this.memberForm.id);
        if (error) throw error;
      } else {
        const newPassword = 'Prime' + Math.floor(1000 + Math.random() * 9000);
        const { error } = await this.supabaseSvc.supabase
          .from('Usuario')
          .insert([{ ...payload, password: newPassword }]);
        
        if (error) throw error;
        alert(`Empleado creado con éxito. Contraseña: ${newPassword}`);
      }

      await this.loadStaff();
      this.closeModal();
    } catch (err: any) {
      console.error('Error al guardar:', err);
      alert(`Error de base de datos: ${err.message || 'Error en la operación'}`);
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  async deleteMember(id: string) {
    if (!isPlatformBrowser(this.platformId) || !confirm('¿Eliminar miembro?')) return;
    try {
      await this.supabaseSvc.supabase.from('Usuario').delete().eq('id', id);
      await this.loadStaff();
    } catch (err) { console.error(err); }
  }

  // --- CONTROLES MODAL ---
  openAddModal() {
    this.modalTitle = 'Registrar Empleado';
    this.memberForm = { 
      id: '', 
      nombre: '', 
      rol: 'MESERO', 
      email: '', 
      telefono: '', 
      restauranteId: APP_CONFIG.RESTAURANT_ID,
      avatarUrl: ''
    };
    this.imagePreview = null;
    this.isModalOpen = true;
  }

  openEditModal(member: any) {
    this.modalTitle = 'Editar Perfil';
    this.memberForm = { ...member };
    this.imagePreview = member.avatarUrl;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    //if (this.authSub) this.authSub.unsubscribe();
  }
}
  