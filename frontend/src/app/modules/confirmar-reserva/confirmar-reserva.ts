import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase'; // Ajusta la ruta a tu servicio

@Component({
  selector: 'app-confirmar-reserva',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="height: 100vh; display: flex; align-items: center; justify-content: center; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6;">
      <div style="text-align: center; padding: 40px; border-radius: 20px; background: white; box-shadow: 0 10px 25px rgba(0,0,0,0.05); max-width: 450px; width: 90%;">
        
        <div *ngIf="cargando" style="margin-bottom: 20px;">
           <h2 style="color: #34495e;">Procesando...</h2>
           <p style="color: #7f8c8d;">Estamos actualizando tu reserva en el sistema.</p>
        </div>

        <div *ngIf="!cargando">
          <h2 [style.color]="error ? '#e74c3c' : '#27ae60'" style="font-size: 2rem; margin-bottom: 10px;">
            {{ titulo }}
          </h2>
          <p style="color: #34495e; font-size: 1.1rem; line-height: 1.5; margin-bottom: 30px;">
            {{ mensaje }}
          </p>
          
          <a routerLink="/" style="display: inline-block; padding: 12px 30px; background-color: #3498db; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background 0.3s;">
            Volver al inicio
          </a>
        </div>

      </div>
    </div>
  `
})
export class ConfirmarReservaComponent implements OnInit {
  titulo = '';
  mensaje = '';
  cargando = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private supabase: SupabaseService // Usamos el cliente que ya tiene el servicio
  ) {}

  async ngOnInit() {
    const folio = this.route.snapshot.queryParamMap.get('folio');
    const accion = this.route.snapshot.queryParamMap.get('accion');

    if (!folio || !accion) {
      this.mostrarError('Enlace incompleto.');
      return;
    }

    try {
      const nuevoEstado = accion === 'confirmar' ? 'CONFIRMADA' : 'CANCELADA';
      
      // 1. Ejecutar la actualización
      const { error } = await this.supabase.supabase
        .from('Reservacion')
        .update({ estado: nuevoEstado })
        .eq('folio', folio);

      if (error) throw error;

      // 2. Ajuste de mensajes lógicos según el estado
      if (nuevoEstado === 'CONFIRMADA') {
        this.titulo = '¡Reserva Confirmada!';
        this.mensaje = `Tu mesa con folio ${folio} está lista. ¡Te esperamos!`;
      } else {
        this.titulo = 'Reserva Cancelada';
        this.mensaje = `Has cancelado la reserva ${folio}. Esperamos verte en otra ocasión.`;
      }

    } catch (err) {
      console.error(err);
      this.mostrarError('No pudimos actualizar el estado, pero verificamos que tu reserva existe.');
    } finally {
      // 3. ESTO ES LO QUE QUITA EL "PROCESANDO"
      // Lo ponemos al final para que pase SÍ O SÍ (éxito o error)
      this.cargando = false; 
    }
  }

  mostrarError(msg: string) {
    this.titulo = '¡Vaya!';
    this.mensaje = msg;
    this.error = true;
    this.cargando = false;
  }
}