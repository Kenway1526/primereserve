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
    // 1. Obtenemos los parámetros de la URL
    const folio = this.route.snapshot.queryParamMap.get('folio');
    const accion = this.route.snapshot.queryParamMap.get('accion');

    if (!folio || !accion) {
      this.mostrarError('Enlace no válido o incompleto.');
      return;
    }

    try {
      const nuevoEstado = accion === 'confirmar' ? 'CONFIRMADA' : 'CANCELADA';

      // 2. Ejecutamos la actualización directamente con el cliente del servicio
      const { error } = await this.supabase.supabase
        .from('Reservacion')
        .update({ estado: nuevoEstado })
        .eq('folio', folio);

      if (error)
      {
        console.error('Error de Supabase:', error);
        this.mostrarError('No se pudo actualizar la reserva.');
      }
      else
      {
        // 3. Mostramos éxito
        this.titulo = accion === 'confirmar' ? '¡Todo listo!' : 'Reserva cancelada';
        this.mensaje = accion === 'confirmar' 
        ? `Tu reservación con folio ${folio} ha sido confirmada con éxito. ¡Te esperamos!`
        : `La reservación con folio ${folio} ha sido cancelada satisfactoriamente.`;
      }
    } catch (err) {
      console.error('Error de Supabase:', err);
      this.mostrarError('No pudimos actualizar el estado. Puede que el folio no exista.');
    } finally {
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