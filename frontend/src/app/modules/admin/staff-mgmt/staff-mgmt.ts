import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FilterPipe } from '../../../shared/pipes/filter-pipe';
import { Modal } from '../../../shared/components/modal/modal';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-staff-mgmt',
  standalone: true,
  imports: [CommonModule, FormsModule, FilterPipe, Modal],
  templateUrl: './staff-mgmt.html',
  styleUrl: './staff-mgmt.scss'
})
export class StaffMgmt implements OnInit {
  private supabaseSvc = inject(SupabaseService);
  private cdr = inject(ChangeDetectorRef);

  public searchText: string = '';
  public isModalOpen = false;
  public isLoading = false;
  public modalTitle: string = '';

  // Modelo alineado a tu tabla 'Usuario'
  public memberForm: any = { id: '', nombre: '', rol: 'WAITER', email: '', password: '', telefono: '', avatarUrl: '', activo: true };
  public staff: any[] = [];
  
  public selectedFile: File | null = null;
  public imagePreview: string | null = null;

  public stats = { total: 0, activos: 0, meseros: 0, cocina: 0, inactivos: 0 };

  async ngOnInit() {
    await this.loadStaff();
  }

  async loadStaff() {
    this.isLoading = true;
    try {
      const restauranteId = localStorage.getItem('active_restaurant_id');
      // Filtramos para NO traer 'CLIENTE'
      const { data, error } = await this.supabaseSvc.supabase
        .from('Usuario')
        .select('*')
        .eq('restauranteId', restauranteId)
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
    this.stats.meseros = this.staff.filter(s => s.rol === 'WAITER').length;
    this.stats.cocina = this.staff.filter(s => s.rol === 'KITCHEN').length;
    // Usamos 'activo' como booleano (asegúrate que exista en tu DB o manéjalo por rol)
    this.stats.activos = this.staff.filter(s => s.activo !== false).length;
    this.stats.inactivos = this.staff.filter(s => s.activo === false).length;
  }

  // --- LOGICA DE IMAGEN ---
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  async uploadAvatar(userId: string): Promise<string> {
    if (!this.selectedFile) return this.memberForm.avatarUrl;
    
    const filePath = `avatars/${userId}_${Date.now()}`;
    // Intento con Supabase Storage
    const { error } = await this.supabaseSvc.supabase.storage
      .from('avatars')
      .upload(filePath, this.selectedFile);

    if (error) {
      console.warn('Fallo Storage Supabase, podrías implementar Cloudinary aquí.');
      return this.memberForm.avatarUrl; 
    }

    const { data: urlData } = this.supabaseSvc.supabase.storage.from('avatars').getPublicUrl(filePath);
    return urlData.publicUrl;
  }

  // --- CRUD ---
  async saveMember() {
    if (!this.memberForm.nombre || !this.memberForm.email) return;
    this.isLoading = true;

    try {
      const restauranteId = localStorage.getItem('active_restaurant_id');
      const tempId = this.memberForm.id || Math.random().toString(36).substring(7);
      
      const finalImg = await this.uploadAvatar(tempId);

      const payload = {
        nombre: this.memberForm.nombre,
        rol: this.memberForm.rol,
        email: this.memberForm.email,
        telefono: this.memberForm.telefono,
        avatarUrl: finalImg,
        activo: this.memberForm.activo,
        restauranteId
      };

      if (this.memberForm.id) {
        await this.supabaseSvc.supabase.from('Usuario').update(payload).eq('id', this.memberForm.id);
      } else {
        await this.supabaseSvc.supabase.from('Usuario').insert({ ...payload, password: 'Prime' + Math.floor(Math.random()*1000) });
      }

      await this.loadStaff();
      this.isModalOpen = false;
    } catch (err) {
      console.error('Error al guardar:', err);
    } finally {
      this.isLoading = false;
    }
  }

  async toggleStatus(member: any) {
    const nuevoEstado = !member.activo;
    const { error } = await this.supabaseSvc.supabase
      .from('Usuario')
      .update({ activo: nuevoEstado })
      .eq('id', member.id);
    
    if (!error) {
      member.activo = nuevoEstado;
      this.calculateStats();
    }
  }

  openAddModal() {
    this.modalTitle = 'Nuevo Empleado';
    this.memberForm = { id: '', nombre: '', rol: 'WAITER', email: '', telefono: '', activo: true, avatarUrl: '' };
    this.imagePreview = null;
    this.selectedFile = null;
    this.isModalOpen = true;
  }

  openEditModal(member: any) {
    this.modalTitle = 'Editar Empleado';
    this.memberForm = { ...member };
    this.imagePreview = member.avatarUrl;
    this.isModalOpen = true;
  }
}