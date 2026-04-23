import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../core/services/supabase';
import { Router } from '@angular/router';

@Component({
  selector: 'app-table-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-map.html',
  styleUrl: './table-map.scss'
})
export class TableMap implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  public mesas: any[] = [];
  public mesaSeleccionada: any = null;

  async ngOnInit() {
    const { data } = await this.supabase.supabase.from('Mesa').select('*');
    this.mesas = data || [];
  }

  abrirOpciones(mesa: any) {
    this.mesaSeleccionada = mesa;
  }

  irAPedido() {
    this.router.navigate(['/waiter/order-entry'], { 
      queryParams: { mesaId: this.mesaSeleccionada.id, num: this.mesaSeleccionada.numeroMesa } 
    });
  }

  // Aquí irán luego las funciones de cobrar y limpiar
}